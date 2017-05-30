import React, { PureComponent } from 'react';
import P from 'prop-types';
import assert from 'assert';

import { CancelReason, cancelable } from 'utils';

export default class Validator extends PureComponent {
	static propTypes = {
		isEnabled: P.bool,
		onStart: P.func,
		onDone: P.func,
	};

	static defaultProps = {
		isEnabled: true,
		onStart () {},  // onStart (validatedFieldNames)
		onDone () {},   // onValidationDone (fieldValidityByFieldName)
	};

	_runningValidationsByFieldNameMap = new Map();
	_fieldNames = [];

	componentWillMount () {
		const children = React.Children.toArray(this.props.children);

		assert(children.length, 'No validators defined, specify atleast 1');

		const uniqueValidatorPairs = new Set();

		children.forEach((validator) => {
			assert(typeof validator.props.name !== 'undefined', `Validator ${validator.type.name} has not props.name!`);

			if ('stopOnError' in validator.props) {
				assert(
					typeof validator.props.stopOnError === 'boolean',
					`Validator ${validator.type.name} has invalid props.stopOnError!`,
				);
			}

			const validatorUniqueKey = `${validator.type.name}-${validator.props.name}`;

			assert(
				!uniqueValidatorPairs.has(validatorUniqueKey),
				`Cannot have same unique validator pairs ${validatorUniqueKey}`,
			);

			uniqueValidatorPairs.add(validatorUniqueKey);

			this._runningValidationsByFieldNameMap.set(validator.props.name, []);
			this._fieldNames.push(validator.props.name);
		});

		this._fieldNames = [ ...new Set(this._fieldNames) ];
	}

	componentDidUpdate (prevProps) {
		if (!this.props.isEnabled) {
			return;
		}

		const prevChildren = React.Children.toArray(prevProps.children);
		const children = React.Children.toArray(this.props.children);
		const validatorsToRun = this._resolveUpdatedValidators(prevChildren, children);

		if (validatorsToRun.length) {
			const validatingFieldNamesSet = validatorsToRun
				.reduce((acc, validator) => {
					acc.add(validator.props.name);

					return acc;
				}, new Set());

			const uniqueValidatingFieldNames = [ ...validatingFieldNamesSet ];

			uniqueValidatingFieldNames
				.forEach((fieldName) => {
				   const validations = this._runningValidationsByFieldNameMap.get(fieldName);

				   validations.forEach((validation) => validation.cancel('aborted by typing'));

				   this._removeRunningValidation(fieldName);
				});

			this.props.onStart(uniqueValidatingFieldNames);

			this._runValidators(validatorsToRun);
		}
	}

	render () {
		return null;
	}

	_resolveUpdatedValidators (prevChildren, nextChildren) {
		return nextChildren.filter((child, index) => {
			return Object.keys(child.props)
				.some((key) => child.props[key] !== prevChildren[index].props[key]);
		});
	}

	async _runValidators (validators) {
		let shouldContinue = true;
		let index = 0;
		const reports = [];
		let wasAborted = false;

		while (shouldContinue) {
			const validator = validators[index];
			const validate = validator.type;
			let report = validate(validator.props);

			if (report) {
				if (typeof report.then === 'function') {
					report = cancelable(report, () => console.log(`Async validation ${validator.type.name} aborted!`));

					this._addRunningValidation(validator.props.name, report);

					try {
						const finalReport = await report;

						console.log(`Async validation ${validator.type.name} DONE`);

						this._removeRunningValidation(validator.props.name, report);

						if (finalReport !== null) {
							if (!validator.props.stopOnError || finalReport.errors || finalReport.warnings) {
								reports.push({
									name: validator.type.name,
									fieldName: validator.props.name,
									...finalReport,
								});
							}
						}
						else {
							const validationReport = {
								name: validator.type.name,
								fieldName: validator.props.name,
							};

							if (validationReport.data) {
								validationReport.data = finalReport.data;
							}

							reports.push(validationReport);
						}
					}
					catch (error) {
						if (error instanceof CancelReason) {
							wasAborted = true;
							shouldContinue = false;
						}
						else {
							reports.push({
								name: validator.type.name,
								fieldName: validator.props.name,
								errors: [ error ],
							});
						}

						this._removeRunningValidation(validator.props.name, report);
					}
				}
				else {
					if (validator.props.stopOnError) {
						shouldContinue = false;
					}

					if (report.errors || report.warnings) {
						reports.push({
							name: validator.type.name,
							fieldName: validator.props.name,
							...report,
						});
					}
					else {
						reports.push({
							name: validator.type.name,
							fieldName: validator.props.name,
						});
					}
				}
			}
			else {
				reports.push({
					name: validator.type.name,
					fieldName: validator.props.name,
				});
			}

			index++;

			if (!validators[index]) {
				shouldContinue = false;
			}
		}

		if (!wasAborted) {
			const consolidatedReports = this._consolidateReports(reports);

			this.props.onDone(consolidatedReports);
		}
	}

	_consolidateReports (reports) {
		return reports.reduce((acc, report) => {
			const { errors, warnings, ...restOfReport } = report;

			if (errors) {
				errors.forEach((error) => {
					acc.push({ type: 'error', message: error, ...restOfReport });
				});
			}

			if (warnings) {
				warnings.forEach((warning) => {
					acc.push({ type: 'warning', message: warning, ...restOfReport });
				});
			}

			if (!errors && !warnings) {
				acc.push({ type: 'valid', ...restOfReport });
			}

			return acc;
		}, []);
	}

	_addRunningValidation (fieldName, validation) {
		const runningValidations = this._runningValidationsByFieldNameMap.get(fieldName);

		runningValidations.push(validation);

		this._runningValidationsByFieldNameMap.set(fieldName, runningValidations);
	}

	_removeRunningValidation (fieldName, validation) {
		const runningValidations = this._runningValidationsByFieldNameMap
			.get(fieldName)
			.filter((runningValidation) => validation !== runningValidation);

		this._runningValidationsByFieldNameMap.set(fieldName, runningValidations);
	}
}

import React, { PureComponent } from 'react';
import P from 'prop-types';
import * as utils from './utils';

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

	_runningValidationsByFieldNameMap = null;

	componentWillMount () {
		if (!this.props.isEnabled) {
			return;
		}

		const children = React.Children.toArray(this.props.children);

		utils.assertValidators(children, (validator) => validator.type.name);

		this._runningValidationsByFieldNameMap = children
			.reduce((map, validator) => map.set(validator.props.name, []), new Map());
	}

	componentDidMount () {
		const validatingFieldNamesSet = this.props.children
			.reduce((acc, validator) => {
				acc.add(validator.props.name);

				return acc;
			}, new Set());

		const uniqueValidatingFieldNames = [ ...validatingFieldNamesSet ];

		this.props.onStart(uniqueValidatingFieldNames);

		this._runValidators(this.props.children);
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
		const stoppedFieldValidators = [];
		const abortedFieldValidators = [];
		const validatorsCount = validators.length;
		let reports = [];

		for (let index = 0; index < validatorsCount; index++) {
			const validator = validators[index];

			if (stoppedFieldValidators.includes(validator.props.name)) {
				continue; // Skip any validators with this field
			}

			const validate = validator.type;
			let report = validate(validator.props);

			report = report || {}; // Allow report generator to return null

			// Sync validation
			if (typeof report.then !== 'function') {
				if (report.errors && validator.props.stopOnError) {
					stoppedFieldValidators.push(validator.props.name);
				}

				reports.push({
					...report,
					name: validator.type.name,
					fieldName: validator.props.name,
				});
			}
			// Async validation
			else {
				report = cancelable(report, () => console.log(`Async validation ${validator.type.name} aborted!`));

				this._addRunningValidation(validator.props.name, report);

				try {
					let asyncReport = await report;

					asyncReport = asyncReport || {};

					console.log(`Async validation ${validator.type.name} DONE`);

					if (asyncReport.errors && validator.props.stopOnError) {
						stoppedFieldValidators.push(validator.props.name);
					}

					const validationReport = {
						...asyncReport,
						name: validator.type.name,
						fieldName: validator.props.name,
					};

					if (asyncReport.data) {
						validationReport.data = asyncReport.data;
					}

					reports.push(validationReport);
				}
				catch (error) {
					if (error instanceof CancelReason) {
						abortedFieldValidators.push(validator.props.name);
					}
					else {
						reports.push({
							name: validator.type.name,
							fieldName: validator.props.name,
							errors: [ error ],
						});

						if (validator.props.stopOnError) {
							stoppedFieldValidators.push(validator.props.name);
						}
					}
				}

				this._removeRunningValidation(validator.props.name, report);
			}
		}

		if (abortedFieldValidators.length) {
			reports = reports.filter((report) => abortedFieldValidators.includes(report.fieldName));
		}

		if (reports) {
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

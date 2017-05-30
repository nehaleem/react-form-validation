import React, { PureComponent } from 'react';
import TextForm from 'text-form/Component';
import pick from 'lodash/pick';
import uniq from 'lodash/uniq';

const style = {
	display: 'flex',
	justifyContent: 'space-between',
};

const codeStyle = {
	backgroundColor: '#cecece',
	fontFamily: 'consolas',
	padding: '4px',
	fontSize: '14px',
};

export default class FormsContainer extends PureComponent {
	constructor (props) {
		super(props);

		this.state = {
			formsAreInvalid: false,
			errorsCount: 0,
			warningsCount: 0,
			forms: [
				{ id: 0, username: 'johny', fullName: 'Jan Dolezal', password1: 'ba', password2: 'ba' },
				{ id: 1, username: 'peter', fullName: 'Peter Orez', password1: 'ba', password2: 'ba' },
			],
			validatingFieldNamesByFormId: {},
			validationReportsByFormId: {},
			shouldValidate: true,
		};

		Object.assign(this.state, this._mergeValidationStateForFormIds([ 0, 1 ], this.state));

		this._lastId = 1;
	}

	render () {
		const forms = this.state.forms
			.map((form, index) => {
				return (
					<TextForm
						key={form.id}
						index={index}
						model={form}
						shouldValidate={this.state.shouldValidate}
						validationReports={this.state.validationReportsByFormId[form.id]}
						validatingFieldNames={this.state.validatingFieldNamesByFormId[form.id]}
						onFieldValueChange={this._handleFormFieldValueChange}
						onValidationStart={this._handleValidationsStart}
						onValidationDone={this._handleValidationsDone}
						onRemove={this._handleFormRemove}
						onFieldValueClone={this._handleFieldValueClone}
						mergeModel={this._handleMergeModelRequest}
					/>
				);
			});
		const isAnyFormValidating = this._isAnyFormValidating();

		return (
			<div style={style}>
				<div>
					<h2>Forms</h2>
					<button disabled={isAnyFormValidating || this.state.formsAreInvalid}>
						Save
					</button>
					<button onClick={this._handleAddFormClick}>Add form</button>

					{forms}
				</div>

				<div>
					<h2>State</h2>
					<pre style={codeStyle}>
						{JSON.stringify(pick(this.state, 'errorsCount', 'warningsCount', 'formsAreInvalid', 'shouldValidate'), null, 2)}
					</pre>
				</div>

				<div>
					<h2>Forms model</h2>
					<pre style={codeStyle}>{JSON.stringify(this.state.forms, null, 2)}</pre>
				</div>

				<div>
					<h2>Reports model</h2>
					<pre style={codeStyle}>{JSON.stringify(this.state.validationReportsByFormId, null, 2)}</pre>
				</div>

				<div>
					<h2>Validating fields model</h2>
					<pre style={codeStyle}>{JSON.stringify(this.state.validatingFieldNamesByFormId, null, 2)}</pre>
				</div>
			</div>
		);
	}

	_handleFieldValueClone = (formIndex, fieldName, model) => {
		const forms = this.state.forms
			.map((form, index) => {
				if (index > formIndex) {
					return Object.assign({}, form, { [fieldName]: model[fieldName] });
				}
				else {
					return form;
				}
			});
		const fieldValidationReports = this.state.validationReportsByFormId[model.id]
			.filter((report) => report.fieldName === fieldName);
		const validationReportsByFormId = { ...this.state.validationReportsByFormId };

		Object.keys(validationReportsByFormId)
			.forEach((formId, index) => {
				if (index > formIndex) {
					validationReportsByFormId[formId] = validationReportsByFormId[formId]
						.filter((report) => report.fieldName !== fieldName) // Remove field reports
						.concat(fieldValidationReports); // Add cloned reports
				}
			});
		const updatedState = {
			...this.state,
			forms,
			validationReportsByFormId,
		};

		this.setState(
			{ shouldValidate: false },
			() => this.setState(
				updatedState,
				() => this.setState({ shouldValidate: true }),
			),
		);
	}

	_handleMergeModelRequest = (formId, partialModel, { shouldValidate = true } = {}) => {
		if (this.state.shouldValidate !== shouldValidate) {
			this.setState(
				{ shouldValidate },
				() => this._mergeModelInFormId(formId, partialModel, () => this.setState({ shouldValidate: !shouldValidate })),
			);
		}
		else {
			this._mergeModelInFormId(formId, partialModel);
		}
	}

	_mergeModelInFormId (formId, partialModel, cb) {
		const forms = this.state.forms
			.map((form) => {
				return form.id === formId ? { ...form, ...partialModel } : form;
			});

		this.setState({ forms }, cb);
	}

	_addForm (model) {
		const state = {
			...this.state,
			forms: [
				...this.state.forms,
				model,
			],
			...this._mergeValidationStateForFormIds([ this._lastId ], this.state),
		};

		this.setState(state);
	}

	_mergeValidationStateForFormIds (ids, oldState) {
		const partialState = {
			validatingFieldNamesByFormId: {
				...oldState.validatingFieldNamesByFormId,
			},
			validationReportsByFormId: {
				...oldState.validationReportsByFormId,
			},
		};

		ids.forEach((id) => {
			partialState.validatingFieldNamesByFormId[id] = [];
			partialState.validationReportsByFormId[id] = [];
		});

		return partialState;
	}

	_handleFormFieldValueChange = (formId, name, value) => {
		const forms = this.state.forms
			.map((form) => {
				if (form.id === formId && form[name] !== value) {
					return { ...form, [name]: value };
				}
				else {
					return form;
				}
			});

		this.setState({ forms });
	}

	_handleAddFormClick = () => {
		this._lastId++;

		this._addForm({ id: this._lastId, username: '', fullName: '', password1: '', password2: '' });
	}

	_handleFormRemove = (id) => {
		const forms = this.state.forms
			.filter((form) => form.id !== id);
		const validatingFieldNamesByFormId = { ...this.state.validatingFieldNamesByFormId };
		const validationReportsByFormId = { ...this.state.validationReportsByFormId };
		const validationsBySeverity = this._groupReportsBySeverity(validationReportsByFormId[id]);
		const errorsCount = this.state.errorsCount - validationsBySeverity.errors.length;
		const warningsCount = this.state.warningsCount - validationsBySeverity.warnings.length;

		delete validatingFieldNamesByFormId[id];
		delete validationReportsByFormId[id];

		this.setState({
			errorsCount, warningsCount, forms,
			validatingFieldNamesByFormId, validationReportsByFormId,
		});
	}

	_handleValidationsStart = (formId, validatingFieldNames) => {
		const validatingFieldNamesByFormId = { ...this.state.validatingFieldNamesByFormId };

		validatingFieldNamesByFormId[formId] = uniq(validatingFieldNamesByFormId[formId].concat(validatingFieldNames));

		this.setState({ validatingFieldNamesByFormId });

		console.log('Starting validating', validatingFieldNames);
	}

	_handleValidationsDone = (formId, reports) => {
		// Remove validating state
		const reportsFieldNames = reports.map((report) => report.fieldName);
		const validatingFieldNames = this.state.validatingFieldNamesByFormId[formId]
			.filter((fieldName) => !reportsFieldNames.includes(fieldName));

		const updatedReports = this.state.validationReportsByFormId[formId]
			.filter((report) => !reportsFieldNames.includes(report.fieldName))
			.concat(reports)
			.filter((report) => report.type !== 'valid');
		const validationReportsByFormId = {
			...this.state.validationReportsByFormId,
			[formId]: updatedReports,
		};
		const allReports = Object.values(validationReportsByFormId)
			.reduce((acc, formReports) => acc.concat(formReports));

		const allReportsBySeverity = this._groupReportsBySeverity(allReports);

		this.setState({
			formsAreInvalid: allReportsBySeverity.errors.length > 0,
			validationReportsByFormId,
			validatingFieldNamesByFormId: {
				...this.state.validatingFieldNamesByFormId,
				[formId]: validatingFieldNames,
			},
			errorsCount: allReportsBySeverity.errors.length,
			warningsCount: allReportsBySeverity.warnings.length,
		});

		this._afterValidations(formId, reports);

		console.log(reports);
	}

	_afterValidations (formId, reports) {
		// Update image url from validation result
		const imageValidaditonResult = reports.find((report) => report.type === 'valid' && report.fieldName === '_imageBlob');

		if (imageValidaditonResult) {
			const forms = this.state.forms
				.map((form) => {
					if (form.id === formId) {
						return { ...form, ...imageValidaditonResult.data };
					}
					else {
						return form;
					}
				});

			this.setState({ forms });
		}
	}

	_groupReportsBySeverity (validationReports) {
		return validationReports
			.reduce((acc, result) => {
				if (result.type === 'error') {
					acc.errors.push(result);
				}
				else if (result.type === 'warning') {
					acc.warnings.push(result);
				}

				return acc;
			}, { errors: [], warnings: [] });
	}

	_isAnyFormValidating () {
		return Object.values(this.state.validatingFieldNamesByFormId)
			.some((validatingFields) => validatingFields.length);
	}
}

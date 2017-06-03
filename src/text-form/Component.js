import React, { PureComponent } from 'react';
import P from 'prop-types';

import Input from 'form-elements/InputComponent';
import validatedFormElement from 'validation/validatedFormElement';
import Reporter from 'validation/Reporter';

const ValidatedInput = validatedFormElement(Input);

const style = {
	border: '1px solid black',
	width: '400px',
	padding: '5px',
	marginBottom: '5px',
};

const dropStyle = {
	border: '2px dotted grey',
	width: '100px',
	height: '60px',
};

export default class Form extends PureComponent {
	static propTypes = {
		index: P.number,
		isDisabled: P.bool,
		model: P.object.isRequired,
		validatingFieldNames: P.array.isRequired,
		validationReports: P.arrayOf(
			P.shape({
				name: P.string,
				id: P.string,
				type: P.oneOf([ 'error', 'warning' ]),
			}),
		).isRequired,
		fieldsState: P.object.isRequired,
		onFieldValueChange: P.func,
		onFieldValueReset: P.func,
		onFieldStateChange: P.func,
		onRemove: P.func,
	};

	static defaultProps = {
		mergeModel () {},         // mergeModel (id, partialModel)
		onFieldValueChange () {}, // onFieldValueChange (id, fieldName, value)
		onFieldStateChange () {}, // onFieldStateChange (id, fieldName, partialState)
		onFieldValueClone () {},  // onFieldValueClone (formIndex, fieldName, model)
		onRemove () {},           // onRemove (id)
	};

	render () {
		const { url, width, height, username, fullName, password1, password2 } = this.props.model;

		return (
			<div className="form" style={style}>
				<button onClick={this._handleRemove}>Remove</button>
				<h3>Form #{this.props.model.id}</h3>

				<div className="field">
					<label>Username</label>

					<ValidatedInput
						type="text"
						disabled={this.props.isDisabled}
						name="username"
						value={username}
						state={this.props.fieldsState.username}
						reports={this.props.validationReports}
						onValidationRequest={this._handleFieldValidationRequest}
						onStateChange={this._handleFieldStateChange}
					/>
					*
					<button
						data-field-name="username"
						disabled={this.props.isDisabled || this.props.validatingFieldNames.includes('username')}
						onClick={this._handleFieldValueClone}
					>
						{ this.props.validatingFieldNames.includes('username') && 'Validating' || 'Clone down' }
					</button>
					<div>
						<Reporter
							names={[ 'username' ]}
							fieldStateByName={this.props.fieldsState}
							reports={this.props.validationReports}
						/>
					</div>
				</div>

				<div className="field">
					<label>Fullname</label>

					<ValidatedInput
						type="text"
						name="fullName"
						disabled={this.props.isDisabled}
						value={fullName}
						state={this.props.fieldsState.fullName}
						reports={this.props.validationReports}
						onValidationRequest={this._handleFieldValidationRequest}
						onStateChange={this._handleFieldStateChange}
					/>
					*
					<button
						data-field-name="fullName"
						disabled={this.props.isDisabled || this.props.validatingFieldNames.includes('fullName')}
						onClick={this._handleFieldValueClone}
					>
						Clone down
					</button>
					<Reporter
						names={[ 'fullName' ]}
						fieldStateByName={this.props.fieldsState}
						reports={this.props.validationReports}
					/>
				</div>

				<div className="field">
					<label>Password1</label>

					<ValidatedInput
						type="password"
						name="password1"
						disabled={this.props.isDisabled}
						value={password1}
						state={this.props.fieldsState.password1}
						reports={this.props.validationReports}
						checkFieldValidity={this._checkPasswordFieldValidity}
						onValidationRequest={this._handleFieldValidationRequest}
						onStateChange={this._handleFieldStateChange}
					/>
					*Match

					<Reporter
						names={[ 'password1' ]}
						fieldStateByName={this.props.fieldsState}
						reports={this.props.validationReports}
					/>
				</div>

				<div className="field">
					<label>Password2</label>

					<ValidatedInput
						type="password"
						name="password2"
						disabled={this.props.isDisabled}
						value={password2}
						state={this.props.fieldsState.password2}
						reports={this.props.validationReports}
						checkFieldValidity={this._checkPasswordFieldValidity}
						onValidationRequest={this._handleFieldValidationRequest}
						onStateChange={this._handleFieldStateChange}
					/>

					<Reporter
						names={[ 'password2' ]}
						fieldStateByName={this.props.fieldsState}
						reports={this.props.validationReports}
					/>
					<Reporter
						names={[ 'password' ]}
						visibilityDependsOn={[ 'password1', 'password2' ]}
						fieldStateByName={this.props.fieldsState}
						reports={this.props.validationReports}
					/>
				</div>

				<div className="field">
					<label>Image</label>
					{
						url ?
							<img src={url} width={width} height={height} /> :
							<input
								name="_imageBlob"
								type="file"
								disabled={this.props.isDisabled}
								multiple={false}
								style={dropStyle}
								onChange={this._handleFileDrop}
							/>
					}

					<button disabled={this.props.isDisabled} onClick={this._handleImageReset}>X</button>

					<Reporter
						names={[ '_imageBlob' ]}
						fieldStateByName={this.props.fieldsState}
						reports={this.props.validationReports}
					/>
				</div>
			</div>
		);
	}

	_handleFieldStateChange = (fieldName, partialState) => {
		this.props.onFieldStateChange(this.props.model.id, fieldName, partialState);
	}

	_handleFieldValueClone = (event) => {
		event.preventDefault();

		const fieldName = event.target.getAttribute('data-field-name');

		this.props.onFieldValueClone(this.props.index, fieldName, this.props.model);
	}

	_handleImageReset = (event) => {
		event.preventDefault();

		this.props.mergeModel(this.props.model.id, {
			url: '',
			width: 0,
			height: 0,
			_imageBlob: null,
		});
	}

	_handleFileDrop = (event) => {
		let files = null;

		if (event.dataTransfer) {
			files = event.dataTransfer.files;
		}
		else if (event.target) {
			files = event.target.files;
		}

		const imageBlob = Array.from(files)[0];

		this._handleFieldValidationRequest(event.target.name, imageBlob);

		event.target.value = null;
	}

	_checkPasswordFieldValidity = (fieldName, reports) => {
		return !reports.some((report) => {
			return (
				report.type === 'error' &&
				(
					report.fieldName === fieldName ||
					report.fieldName === 'password'
				)
			);
		});
	}

	_handleValidationsStart = (validatingFieldNames) => {
		this.props.onValidationStart(this.props.model.id, validatingFieldNames);
	}

	_handleValidationsDone = (reports) => {
		this.props.onValidationDone(this.props.model.id, reports);
	}

	_handleFieldValidationRequest = (name, value) => {
		this.props.onFieldValueChange(this.props.model.id, name, value);
	}

	_handleRemove = () => {
		this.props.onRemove(this.props.model.id);
	}
}


import React, { PureComponent } from 'react';
import P from 'prop-types';

import Input from 'form-elements/InputComponent';
import Validator from 'validation/Validator';
import validatedFormElement from 'validation/validatedFormElement';
import * as Validators from 'validation/validators';
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
		model: P.object.isRequired,
		shouldValidate: P.bool,
		validatingFieldNames: P.array.isRequired,
		validationReports: P.arrayOf(
			P.shape({
				fieldName: P.string,
				name: P.string,
				type: P.oneOf([ 'error', 'warning', 'valid' ]),
			}),
		),
		onValidationStart: P.func,
		onValidationDone: P.func,
		onFieldValueChange: P.func,
		onFieldValueReset: P.func,
		onRemove: P.func,
	};

	static defaultProps = {
		onValidationStart () {},  // onValidationStart (id, fieldNames)
		onValidationDone () {},   // onValidationDone (id, fieldValidityByFieldName)
		onFieldValueChange () {}, // onFieldValueChange (id, fieldName, value)
		onRemove () {},           // onRemove (id)
		onFieldValueClone () {},  // onFieldValueClone (formIndex, fieldName, model)
		mergeModel () {},         // mergeModel (id, partialModel)
	};

	render () {
		const { url, width, height, username, fullName, password1, password2, _imageBlob } = this.props.model;

		return (
			<div style={style}>
				<Validator
					isEnabled={this.props.shouldValidate}
					onStart={this._handleValidationsStart}
					onDone={this._handleValidationsDone}
				>
					<Validators.ShouldntContainBullshit name="username" value={username} />
					<Validators.IsRequired name="username" value={username.length} />
					<Validators.LengthRange stopOnError={true} name="username" from={3} length={username.length} />
					<Validators.IsUniqueAsync name="username" value={username.length} />

					<Validators.IsRequired name="fullName" value={fullName.length} />

					<Validators.IsRequired name="password1" value={password1} />
					<Validators.IsRequired name="password2" value={password2} />
					<Validators.MustBeEqual name="password" value1={password1} value2={password2} />

					<Validators.ValidateImage name="_imageBlob" imageBlob={_imageBlob} />
				</Validator>

				<button onClick={this._handleRemove}>Remove</button>
				<h3>Form #{this.props.model.id}</h3>

				<div>
					Username:

					<ValidatedInput
						type="text"
						name="username"
						value={username}
						reports={this.props.validationReports}
						onValidationRequest={this._handleFieldValidationRequest}
					/>
					*
					<button
						data-field-name="username"
						disabled={this.props.validatingFieldNames.includes('username')}
						onClick={this._handleFieldValueClone}
					>
						{ this.props.validatingFieldNames.includes('username') && 'Validating' || 'Clone down' }
					</button>
				</div>

				<div>
					Fullname:

					<ValidatedInput
						type="text"
						name="fullName"
						value={fullName}
						reports={this.props.validationReports}
						onValidationRequest={this._handleFieldValidationRequest}
					/>
					*
					<button
						data-field-name="fullName"
						disabled={this.props.validatingFieldNames.includes('fullName')}
						onClick={this._handleFieldValueClone}
					>
						Clone down
					</button>
				</div>

				<div>
					Password1:

					<ValidatedInput
						type="password"
						name="password1"
						value={password1}
						reports={this.props.validationReports}
						checkFieldValidity={this._checkPasswordFieldValidity}
						onValidationRequest={this._handleFieldValidationRequest}
					/>
					*Match
				</div>

				<div>
					Password2:

					<ValidatedInput
						type="password"
						name="password2"
						value={password2}
						reports={this.props.validationReports}
						checkFieldValidity={this._checkPasswordFieldValidity}
						onValidationRequest={this._handleFieldValidationRequest}
					/>
				</div>

				<div>
					DropThatShit:
					{
						url ?
							<img src={url} width={width} height={height} /> :
							<input
								name="_imageBlob"
								type="file"
								multiple={false}
								style={dropStyle}
								onChange={this._handleFileDrop}
							/>
					}

					<button onClick={this._handleImageReset}>X</button>
					<button
						data-field-name="url"
						disabled={this.props.validatingFieldNames.includes('url')}
						onClick={this._handleFieldValueClone}
					>
						{ this.props.validatingFieldNames.includes('_imageBlob') && 'Validating' || 'Clone down' }
					</button>
				</div>

				<hr />

				{
					this.props.validationReports.length > 0 &&
					(
						<div>
							<h4>Validations</h4>
							<Reporter reports={this.props.validationReports} />
						</div>
					)
				}
			</div>
		);
	}

	_handleFieldValueClone = (event) => {
		event.preventDefault();

		const fieldName = event.target.getAttribute('data-field-name');

		this.props.onFieldValueClone(this.props.model.id, fieldName, this.props.model);
	}

	_handleImageReset = (event) => {
		event.preventDefault();

		this.props.mergeModel(this.props.model.id, {
			url: '',
			width: 0,
			height: 0,
			_imageBlob: null,
		}, { shouldValidate: false });
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


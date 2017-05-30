import React, { PureComponent } from 'react';
import ReactDOM from 'react-dom';
import P from 'prop-types';
import debounce from 'lodash/debounce';
import omit from 'lodash/omit';

export default (FormElement) => {
	class ValidatedFormElement extends PureComponent {
		static propTypes = {
			value: P.any,
			reports: P.array,
			changeDebounceTimeout: P.number,
			checkFieldValidity: P.func,
			onValidationRequest: P.func,
		};

		static defaultProps = {
			changeDebounceTimeout: 300,
			// checkFieldValidity (fieldName, reports)
			checkFieldValidity (fieldName, reports) {
				return !reports.some((report) => report.type === 'error' && report.fieldName === fieldName);
			},
			onValidationRequest () {}, // onValidationRequest (name, value)
		};

		state = {
			isDirty: false,
		}

		componentDidMount () {
			this._setValueNatively(this.props.value);
		}

		componentDidUpdate (prevProps) {
			if (prevProps.value !== this.props.value) {
				this._setValueNatively(this.props.value);
			}
		}

		constructor (props) {
			super(props);

			this._handleChangeEventDebounced = debounce(this._handleChangeEvent, this.props.changeDebounceTimeout);
		}

		render () {
			const props = omit(this.props, Object.keys(ValidatedFormElement.propTypes));
			const isValid = this.props.checkFieldValidity(this.props.name, this.props.reports);
			const style = {};

			if (this.state.isDirty) {
				if (isValid) {
					style.border = '2px solid green';
					style.backgroundColor = '#b4ffba';
				}
				else {
					style.border = '2px solid red';
					style.backgroundColor = '#ffa8a8';
				}
			}

			return (
				<FormElement
					ref={(node) => this._node = node}
					{...props}
					style={style}
					onChange={this._handleChange}
					onBlur={this._handleBlur}
				/>
			);
		}

		_setValueNatively (value) {
			ReactDOM.findDOMNode(this._node).value = value;
		}

		_handleBlur = (event) => {
			const { value, name } = event.target;

			if (this.state.isDirty) {
				this.props.onValidationRequest(name, value);
			}
		}

		_handleChange = (event) => {
			const { value, name } = event.target;

			this._handleChangeEventDebounced(name, value);
		}

		_handleChangeEvent = (name, value) => {
			if (!this.state.isDirty) {
				this.setState({ isDirty: true });
			}

			this.props.onValidationRequest(name, value);
		}
	}

	return ValidatedFormElement;
};

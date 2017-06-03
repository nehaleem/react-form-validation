import React, { PureComponent } from 'react';
import ReactDOM from 'react-dom';
import P from 'prop-types';
import debounce from 'lodash/debounce';
import omit from 'lodash/omit';

export default (FormElement) => {
	class ValidatedFormElement extends PureComponent {
		static propTypes = {
			value: P.any,
			state: P.shape({
				isDirty: P.bool,
				wasFocused: P.bool,
			}),
			reports: P.array,
			changeDebounceTimeout: P.number,
			checkFieldValidity: P.func,
			onValidationRequest: P.func,
			onStateChange: P.func,
		};

		static defaultProps = {
			changeDebounceTimeout: 300,
			// checkFieldValidity (fieldName, reports)
			checkFieldValidity (name, reports) {
				return !reports.some((report) => report.type === 'error' && report.name === name);
			},
			onValidationRequest () {}, // onValidationRequest (name, value)
			onStateChange () {},       // onStateChange (name, changedState)
		};

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

			if ((this.props.state.wasFocused || this.props.state.isDirty) && !isValid) {
				style.border = '2px solid red';
				style.backgroundColor = '#ffa8a8';
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

			if (!this.props.state.wasFocused) {
				this.props.onStateChange(name, { wasFocused: true });
			}

			if (this.props.value !== value) {
				this.props.onValidationRequest(name, value);
			}
		}

		_handleChange = (event) => {
			const { value, name } = event.target;

			this._handleChangeEventDebounced(name, value);
		}

		_handleChangeEvent = (name, value) => {
			this.props.onValidationRequest(name, value);

			if (!this.props.state.isDirty) {
				this.props.onStateChange(name, { isDirty: true });
			}
		}
	}

	return ValidatedFormElement;
};

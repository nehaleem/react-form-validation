import React, { PureComponent } from 'react';
import Draggable from 'react-draggable';

import { AppSettings } from 'mocks';

const DEFAULT_POSITION = { x: 550, y: 0 };

const Key = {
	SUBMIT_RESPONSE_DELAY: 'SUBMIT_RESPONSE_DELAY',
	ASYNC_FIELD_VALIDATION_DELAY: 'ASYNC_FIELD_VALIDATION_DELAY',
	SUBMIT_SHOULD_RETURN_ERRORS: 'SUBMIT_SHOULD_RETURN_ERRORS',
};

export default class SettingsMenu extends PureComponent {
	render () {
		return (
			<Draggable handle="strong" defaultPosition={DEFAULT_POSITION}>
				<div className="box no-cursor settings">
					<strong className="cursor">
						<div>Settings</div>
					</strong>

					<div>
						<div className="field">
							<label>
								Submit delay
							</label>
							<input
								name={Key.SUBMIT_RESPONSE_DELAY}
								type="number"
								defaultValue={1500}
								onChange={this._handleFieldEvent}
							/>
							ms
						</div>

						<div className="field">
							<label>
								Async validation delay
							</label>
							<input
								name={Key.ASYNC_FIELD_VALIDATION_DELAY}
								type="number"
								defaultValue={2000}
								onChange={this._handleFieldEvent}
							/>
							ms
						</div>

						<div className="field">
							<label>
								Submit should return errors
							</label>
							<input
								name={Key.SUBMIT_SHOULD_RETURN_ERRORS}
								type="checkbox"
								onChange={this._handleFieldEvent}
							/>
						</div>
					</div>
				</div>
			</Draggable>
		);
	}

	_handleFieldEvent = (event) => {
		const { name } = event.target;

		switch (name) {
			case Key.SUBMIT_RESPONSE_DELAY:
				AppSettings.SUBMIT_RESPONSE_DELAY = Number.parseInt(event.target.value, 10);
				break;

			case Key.ASYNC_FIELD_VALIDATION_DELAY:
				AppSettings.ASYNC_FIELD_VALIDATION_DELAY = Number.parseInt(event.target.value, 10);
				break;

			case Key.SUBMIT_SHOULD_RETURN_ERRORS:
				AppSettings.SUBMIT_SHOULD_RETURN_ERRORS = event.target.checked;
				break;
		}
	}
}

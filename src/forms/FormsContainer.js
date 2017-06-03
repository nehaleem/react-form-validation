import React, { PureComponent } from 'react';

import bulkValidatedForms from 'validation/bulkValidatedFormsContainer';
import * as Validators from 'validation/validators';
import TextForms from 'forms/TextFormsContainer';
import { submit } from 'mocks';

const BulkValidatedTextForms = bulkValidatedForms(TextForms);

export default class FormsContainer extends PureComponent {
	state = {
		items: [],
		isValidating: true,
		isSubmitting: false,
		itemsContainErrors: false,
		isAnyFieldWithReportsDirty: false,
		errorsCount: 0,
		warningsCount: 0,
	};

	_lastId = 0;
	_bulkValidatedFormsNode = null;

	static _getValueFromKey = (key) => (item) => item[key];

	render () {
		const isSubmitDisabled = (
			!this.state.items.length ||
			this.state.isValidating ||
			this.state.isSubmitting ||
			this.state.isAnyFieldWithReportsDirty
		);

		return (
			<div>
				<div>
					<h2>Statistics</h2>

					<p>Errors: {this.state.errorsCount}</p>
					<p>Warnings: {this.state.warningsCount}</p>
				</div>

				<h2>Forms</h2>

				<div className="controls">
					<button
						onClick={this._handleSubmit}
						disabled={isSubmitDisabled}
					>
						Submit
					</button>
					<button onClick={this._handleAddItemClick}>Add form</button>
				</div>

				<div>
					<BulkValidatedTextForms
						ref={(node) => this._bulkValidatedFormsNode = node}
						items={this.state.items}
						isDisabled={this.state.isSubmitting}
						mergeModel={this._handleMergeItemModel}
						onItemRemove={this._handleItemRemove}
						onStatisticsReport={this._handleNewStatisticsReport}
						onValidatingStatusChange={this._handleValidatingStatusChange}
						onItemFieldValueChange={this._handleFieldValueChange}
						onItemFieldValueClone={this._handleFieldValueClone}
						onValidationDone={this._handleValidationDone}
					>
						<Validators.IsRequired
							name="username"
							value={FormsContainer._getValueFromKey('username')}
							propKeys={[ 'username' ]}
						/>
						<Validators.LengthRange
							stopOnError={true}
							name="username" from={3}
							value={FormsContainer._getValueFromKey('username')}
							propKeys={[ 'username' ]}
						/>
						<Validators.ShouldntContainBullshit
							name="username"
							value={FormsContainer._getValueFromKey('username')}
							propKeys={[ 'username' ]}
						/>

						<Validators.IsRequired
							name="fullName"
							stopOnError={true}
							value={FormsContainer._getValueFromKey('fullName')}
							propKeys={[ 'fullName' ]}
						/>

						<Validators.IsRequired
							name="password1"
							stopOnError={true}
							value={FormsContainer._getValueFromKey('password1')}
							propKeys={[ 'password1' ]}
						/>
						<Validators.IsRequired
							name="password2"
							stopOnError={true}
							value={FormsContainer._getValueFromKey('password2')}
							propKeys={[ 'password2' ]}
						/>
						<Validators.MustBeEqual
							name="password"
							stopOnError={true}
							value1={FormsContainer._getValueFromKey('password1')}
							value2={FormsContainer._getValueFromKey('password2')}
							message="Passwords must be equal"
							propKeys={[ 'password1', 'password2' ]}
						/>

						<Validators.IsRequired
							stopOnError={true}
							value={FormsContainer._getValueFromKey('_imageBlob')}
							name="_imageBlob"
							propKeys={[ '_imageBlob' ]}
						/>
						<Validators.ValidateImage
							name="_imageBlob"
							blobData={FormsContainer._getValueFromKey('_imageBlob')}
							propKeys={[ '_imageBlob' ]}
						/>

						<Validators.CheckSpellingAsyncBulk
							name="check-spelling"
							dontRunIfKeysHasErrors={[ 'username', 'fullName' ]}
							processAsBulk={true}
							propKeys={[ 'username', 'fullName' ]}
						/>
					</BulkValidatedTextForms>
				</div>
			</div>
		);
	}

	_handleAddItemClick = () => {
		const item = { id: this._lastId, username: '', fullName: '', password1: '', password2: '', _imageBlob: null };
		const items = this.state.items.slice();

		items.push(item);

		this._lastId++;

		this.setState({ items });
	}

	_handleItemRemove = (itemId) => {
		const items = this.state.items.filter((item) => item.id !== itemId);

		this.setState({ items });
	}

	_handleFieldValueChange = (itemId, name, value) => {
		const items = this.state.items.map((item) => {
			if (item.id === itemId) {
				return { ...item, [name]: value };
			}
			else {
				return item;
			}
		});

		this.setState({ items });
	}

	_handleFieldValueClone = (itemIndex, name, clonningItem) => {
		const items = this.state.items.map((item, index) => {
			if (index > itemIndex) {
				return { ...item, [name]: clonningItem[name] };
			}
			else {
				return item;
			}
		});

		this.setState({ items });
	}

	_handleSubmit = async () => {
		if (this.state.itemsContainErrors) {
			this._bulkValidatedFormsNode.touchAllFieldsStates();
		}
		else {
			await this._setStateAsync({ isSubmitting: true });

			const response = await submit(this.state.items);

			await this._setStateAsync({ isSubmitting: false });

			if (response.statusCode === 406) {
				this._bulkValidatedFormsNode.overrideReports(response.data.problems);
			}
			else {
				alert('Items are submited without errors!');
			}
		}
	}

	_handleNewStatisticsReport = (statistics) => {
		this.setState(statistics);
	}

	_handleValidatingStatusChange = (isValidating) => {
		this.setState({ isValidating });
	}

	_handleMergeItemModel = (itemId, partialModel) => {
		const items = this.state.items.map((item) => {
			if (item.id === itemId) {
				return { ...item, ...partialModel };
			}
			else {
				return item;
			}
		});

		this.setState({ items });
	}

	_handleValidationDone = (reports) => {
		const positiveImageReport = this._findPositiveImageValidationFromReports(reports);

		if (positiveImageReport) {
			const items = this.state.items.map((item) => {
				if (item.id === positiveImageReport.itemId) {
					return { ...item, ...positiveImageReport.data };
				}
				else {
					return item;
				}
			});

			this.setState({ items });

			this._bulkValidatedFormsNode.touchFieldStates(positiveImageReport.itemId, [ '_imageBlob' ]);
		}
	}

	_findPositiveImageValidationFromReports (reports) {
		return reports.find((report) => {
			return report.type === 'valid' && report.id === 'ValidateImage' && report.data;
		});
	}

	_setStateAsync (changes) {
		return new Promise((resolve) => {
			this.setState(changes, () => resolve());
		});
	}
}

import React, { Component } from 'react';
import P from 'prop-types';
import uniq from 'lodash/uniq';
import groupBy from 'lodash/groupBy';
import omit from 'lodash/omit';
import difference from 'lodash/difference';
import pullAll from 'lodash/pullAll';

import BulkValidator from 'validation/BulkValidator';

export default function (ItemsContainer) {
	class BulkValidatedItemsContainer extends Component {
		static propTypes = {
			items: P.array,
			isValidatorEnabled: P.bool,
			children: P.arrayOf(P.element),
			onStatisticsReport: P.func, // onStatisticsReport ({ itemsContainErrors, isAnyFieldWithReportsDirty, errorsCount, warningsCount })
			onValidatingStatusChange: P.func, // onValidationStatusChange (isValidating)
			onValidationDone: P.func, // onValidationDone (reports)
		};

		static defaultProps = {
			isValidatorEnabled: true,
			onStatisticsReport () {},
			onValidationStatusChange () {},
			onValidationDone () {},
		};

		state = {
			isAnyFieldWithReportsDirty: false,
			validatingKeysByItemId: {},
			validationReportsByItemId: {},
			fieldsStateByItemId: {},
		};

		shouldComponentUpdate (nextProps, nextState) {
			return (
				this.state !== nextState ||
				this.props.items !== nextProps.items
			);
		}

		componentWillReceiveProps (nextProps) {
			if (this.props.items !== nextProps.items) {
				const prevItemIds = this.props.items.map((item) => item.id);
				const nextItemIds = nextProps.items.map((item) => item.id);

				const deletedItemIds = difference(prevItemIds, nextItemIds);
				const addedItemIds = difference(nextItemIds, prevItemIds);

				if (deletedItemIds.length || addedItemIds.length) {
					const validatingKeysByItemId = { ...this.state.validatingKeysByItemId };
					const validationReportsByItemId = { ...this.state.validationReportsByItemId };
					const fieldsStateByItemId = { ...this.state.fieldsStateByItemId };

					if (deletedItemIds.length) {
						deletedItemIds.forEach((id) => {
							delete validatingKeysByItemId[id];
							delete validationReportsByItemId[id];
							delete fieldsStateByItemId[id];
						});
					}

					if (addedItemIds.length) {
						addedItemIds.forEach((id) => {
							validatingKeysByItemId[id] = [];
							validationReportsByItemId[id] = [];
							fieldsStateByItemId[id] = {};

							Object.keys(nextProps.items[0]).forEach((key) => {
								fieldsStateByItemId[id][key] = { isDirty: false, wasFocused: false };
							});
						});
					}

					this.setState({ validatingKeysByItemId, validationReportsByItemId, fieldsStateByItemId });
				}
			}
		}

		componentWillUpdate (nextProps, nextState) {
			if (
				this.state.validationReportsByItemId !== nextState.validationReportsByItemId ||
				this.state.fieldsStateByItemId !== nextState.fieldsStateByItemId
			) {
				console.log(nextState.validationReportsByItemId);
				const isAnyFieldWithReportsDirty = this._isAnyFieldWithReportsDirty(nextState);

				if (this.state.validationReportsByItemId !== nextState.validationReportsByItemId) {
					// Update error and warning count
					const allReports = Object.keys(nextState.validationReportsByItemId)
						.reduce((acc, itemId) => acc.concat(nextState.validationReportsByItemId[itemId]), []);

					if (allReports.length) {
						const allReportsBySeverity = groupBy(allReports, (report) => report.type);

						allReportsBySeverity.error = allReportsBySeverity.error || [];
						allReportsBySeverity.warning = allReportsBySeverity.warning || [];

						this.props.onStatisticsReport({
							isAnyFieldWithReportsDirty,
							errorsCount: allReportsBySeverity.error.length,
							warningsCount: allReportsBySeverity.warning.length,
							itemsContainErrors: allReportsBySeverity.error.length > 0,
						});
					}
					else {
						this.props.onStatisticsReport({
							isAnyFieldWithReportsDirty,
							errorsCount: 0,
							warningsCount: 0,
							itemsContainErrors: false,
						});
					}
				}
				else {
					this.props.onStatisticsReport({ isAnyFieldWithReportsDirty });
				}

				const isAnyItemValidating = this._isAnyItemValidating();

				this.props.onValidatingStatusChange(isAnyItemValidating);
			}
		}

		render () {
			return (
				<div>
					<BulkValidator
						items={this.props.items}
						isEnabled={this.props.isValidatorEnabled}
						onStart={this._handleValidationsStart}
						onDone={this._handleValidationsDone}
					>
						{this.props.children}
					</BulkValidator>

					<ItemsContainer
						{...omit(this.props, Object.keys(BulkValidatedItemsContainer.propTypes))}
						items={this.props.items}
						validationReportsByItemId={this.state.validationReportsByItemId}
						validatingKeysByItemId={this.state.validatingKeysByItemId}
						fieldsStateByItemId={this.state.fieldsStateByItemId}
						onItemFieldStateChange={this._handleFieldStateChange}
					/>
				</div>
			);
		}

		overrideReports (reports) {
			const reportsByItemId = groupBy(reports, (report) => report.itemId);

			const validationReportsByItemId = { ...this.state.validationReportsByItemId };

			for (const [ itemId, reports ] of Object.entries(reportsByItemId)) {
				validationReportsByItemId[itemId] = reports; // Override saved reports
			}

			this.setState({ validationReportsByItemId });
		}

		touchAllFieldsStates () {
			const fieldsStateByItemId = { ...this.state.fieldsStateByItemId };

			Object.keys(fieldsStateByItemId).forEach((itemId) => {
				fieldsStateByItemId[itemId] = { ...fieldsStateByItemId[itemId] };

				Object.keys(fieldsStateByItemId[itemId]).forEach((name) => {
					fieldsStateByItemId[itemId][name] = { isDirty: true, wasFocused: true };
				});
			});

			this.setState({ fieldsStateByItemId });
		}

		touchFieldStates (itemId, fieldNames) {
			const fieldsStateByItemId = { ...this.state.fieldsStateByItemId };

			fieldsStateByItemId[itemId] = { ...fieldsStateByItemId[itemId] };

			fieldNames = fieldNames || Object.keys(fieldsStateByItemId[itemId]);

			fieldNames.forEach((name) => {
				fieldsStateByItemId[itemId][name] = { isDirty: true, wasFocused: true };
			});

			this.setState({ fieldsStateByItemId });
		}

		_handleFieldStateChange = (itemId, name, partialState) => {
			const fieldsStateByItemId = {
				...this.state.fieldsStateByItemId,
				[itemId]: {
					...this.state.fieldsStateByItemId[itemId],
					[name]: {
						...this.state.fieldsStateByItemId[itemId][name],
						...partialState,
					},
				},
			};

			this.setState({ fieldsStateByItemId });
		}

		_isAnyFieldWithReportsDirty = (state) => {
			return Object.keys(state.fieldsStateByItemId)
				.some((itemId) => {
					const fieldsStateByName = state.fieldsStateByItemId[itemId];

					return Object.keys(fieldsStateByName)
						.some((name) => {
							if (fieldsStateByName[name].isDirty || fieldsStateByName[name].wasFocused) {
								return state.validationReportsByItemId[itemId].length > 0;
							}
							else {
								return false;
							}
						});
				});
		}

		_handleValidationsStart = (validatingKeysByItemId) => {
			this.setState({
				validatingKeysByItemId: {
					...this.state.validatingKeysByItemId,
					...validatingKeysByItemId,
				},
			});
		}

		_handleValidationsDone = (reports) => {
			const updatedState = {};
			const reportsByItemId = groupBy(reports, (item) => item.itemId);

			// Remove item ids from reports which are not exists anymore
			Object.keys(reportsByItemId).forEach((itemId) => {
				if (!this.state.fieldsStateByItemId[itemId]) {
					delete reportsByItemId[itemId];
				}
			});

			// Remove validated propKeys from state
			const validatingKeysByItemId = { ...this.state.validatingKeysByItemId };

			for (const [ itemId, itemReports ] of Object.entries(reportsByItemId)) {
				const validatedPropKeys = itemReports.reduce((keys, report) => keys.concat(report.initiatedByKeys), []);
				const uniqueValidatedPropKeys = uniq(validatedPropKeys);

				validatingKeysByItemId[itemId] = pullAll(validatingKeysByItemId[itemId], uniqueValidatedPropKeys);
			}

			updatedState.validatingKeysByItemId = validatingKeysByItemId;

			// Update validation reports
			const validationReportsByItemId = { ...this.state.validationReportsByItemId };

			for (const [ itemId, itemReports ] of Object.entries(reportsByItemId)) {
				const validatedKeys = uniq(itemReports.map((report) => report.name));
				const reportsBySeverity = groupBy(itemReports, (report) => report.type);

				validationReportsByItemId[itemId] = validationReportsByItemId[itemId]
					.filter((report) => !validatedKeys.includes(report.name)) // Remove old reports for field name
					.concat(reportsBySeverity.error || [])
					.concat(reportsBySeverity.warning || []);
			}

			updatedState.validationReportsByItemId = validationReportsByItemId;

			this.setState(updatedState);

			this.props.onValidationDone(reports);
		}

		_isAnyItemValidating () {
			return Object.values(this.state.validatingKeysByItemId)
				.some((keys) => keys.length);
		}

		_setStateAsync (changes) {
			return new Promise((resolve) => {
				this.setState(changes, () => resolve());
			});
		}
	}

	return BulkValidatedItemsContainer;
}

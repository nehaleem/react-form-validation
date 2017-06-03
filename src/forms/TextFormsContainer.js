import React, { PureComponent } from 'react';
import P from 'prop-types';
import omit from 'lodash/omit';

import TextForm from 'text-form/Component';

export default class TextFormsContainer extends PureComponent {
	static propTypes = {
		items: P.array.isRequired,
		validationReportsByItemId: P.object.isRequired,
		validatingKeysByItemId: P.object.isRequired,
		fieldsStateByItemId: P.object.isRequired,
		onItemFieldStateChange: P.func.isRequired, // onItemFieldStateChange (id, name, partialState)
		onItemRemove: P.func.isRequired, // onItemRemove (itemId)
		onItemFieldValueClone: P.func.isRequired, // onItemFieldValueClone (itemIndex, name, item)
		onItemFieldValueChange: P.func.isRequired, // onItemFieldValueChange (id, name, value)
	};

	render () {
		const props = omit(this.props, Object.keys(TextFormsContainer.propTypes));

		const items = this.props.items
			.map((item, index) => {
				return (
					<TextForm
						{...props}
						key={item.id}
						index={index}
						model={item}
						validationReports={this.props.validationReportsByItemId[item.id]}
						validatingFieldNames={this.props.validatingKeysByItemId[item.id]}
						fieldsState={this.props.fieldsStateByItemId[item.id]}
						onRemove={this.props.onItemRemove}
						onFieldValueChange={this.props.onItemFieldValueChange}
						onFieldValueClone={this.props.onItemFieldValueClone}
						onFieldStateChange={this.props.onItemFieldStateChange}
					/>
				);
			});

		return (
			<div>
				{items}
			</div>
		);
	}
}

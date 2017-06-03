import React from 'react';
import pure from 'recompose/pure';
import uniqBy from 'lodash/uniqBy';

const Reporter = (props) => {
	const { names, fieldStateByName, reports } = props;
	const visibilityDependsOn = props.visibilityDependsOn || names;

	let filteredReports = reports.filter((report) => names.includes(report.name));

	filteredReports = uniqBy(filteredReports, (report) => report.message);

	if (!filteredReports.length) {
		return null;
	}

	const shouldShowReports = visibilityDependsOn
		.some((name) => {
			const fieldState = fieldStateByName[name];

			if (fieldState) {
				return fieldState.isDirty || fieldState.wasFocused;
			}
			else {
				return filteredReports.some((report) => report.initiatedByKeys.includes(name));
			}
		});

	if (!shouldShowReports) {
		return null;
	}
	else {
		const messsages = filteredReports
			.map((report) => {
				const style = {
					...(report.type === 'error' ? { color: 'red' } : { color: 'yellow' }),
				};
				const key = `${report.itemId}-${report.name}-${report.id}`;

				return <li style={style} key={key}>{report.message}</li>;
			});

		return (
			<ul>
				{messsages}
			</ul>
		);
	}
};

export default pure(Reporter);

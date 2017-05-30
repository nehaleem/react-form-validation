import React from 'react';
import pure from 'recompose/pure';

const Reporter = (props) => {
	const messsages = props.reports
		.map((report) => {
			return <li key={`${report.fieldName}-${report.name}`}>{report.fieldName}: {report.message}</li>;
		});

	return (
		<ul>
			{messsages}
		</ul>
	);
};

export default pure(Reporter);

// presumably standard
export class CancelReason extends Error {}

// Promise.cancelable? third party library?
export function cancelable (p, onCancel) {
	// todo: refactor into utility function allowing: return cancelable(resultPromise, () => {xhr.abort()})
	var doCancel = null;
	var cancelPromise = new Promise((resolve, reject) => {
		doCancel = (reason) => {
			reject(new CancelReason(reason));

			return raced;
		};
	});

	var raced = Promise.race([ p, cancelPromise ])
		.catch((reason) => {
			if (reason instanceof CancelReason) {
				onCancel();
			}
			return Promise.reject(reason);
		});

	raced.cancel = doCancel;

	return raced;
}

export function generateErrors (errors) {
	return { errors };
}

export function generateMultipleReports (reportsByName) {
	return { reportsByName };
}

export function generateWarnings (warnings) {
	return { warnings };
}

export function parseValidationResults (fieldName, validationResults) {
	return validationResults.filter((result) => result.fieldName === fieldName);
}

export function areResultsWithoutError (...validationResults) {
	validationResults = validationResults.reduce((acc, results) => {
		if (results) {
			acc = acc.concat(results);
		}

		return acc;
	}, []);

	if (!validationResults) {
		return true;
	}
	else {
		return validationResults.every((result) => result.type !== 'error');
	}
}

export const delay = (delay = 1000) => new Promise((resolve) => setTimeout(() => resolve(), delay));

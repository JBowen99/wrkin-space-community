let bookmarkAddedCount = $state(0);

export function signalBookmarkAdded() {
	bookmarkAddedCount++;
}

export function watchBookmarkSignal(): number {
	return bookmarkAddedCount;
}

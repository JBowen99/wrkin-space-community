const REPORT_TIMELINE_MIN_HEIGHT_REM = 28;
const REPORT_TIMELINE_MAX_VIEWPORT_RATIO = 0.75;

/** Size the host to content height, capped at 75% of the viewport. */
export function fitReportTimelineHostHeight(host: HTMLElement) {
	const gantt = host.querySelector<HTMLElement>('.sg-gantt');
	if (!gantt) return;

	host.style.height = '';
	gantt.style.height = '';

	const natural = gantt.offsetHeight;
	const cap = window.innerHeight * REPORT_TIMELINE_MAX_VIEWPORT_RATIO;
	const minHeight = Math.min(REPORT_TIMELINE_MIN_HEIGHT_REM * 16, cap);
	const height = Math.min(Math.max(natural, minHeight), cap);

	host.style.height = `${height}px`;
	gantt.style.height = '100%';
}

export function attachReportTimelineHeightFit(host: HTMLElement, onFit: () => void): () => void {
	let frame = 0;

	const schedule = () => {
		if (frame) return;
		frame = requestAnimationFrame(() => {
			frame = 0;
			onFit();
		});
	};

	window.addEventListener('resize', schedule, { passive: true });
	const resizeObserver = new ResizeObserver(schedule);
	resizeObserver.observe(host);
	const gantt = host.querySelector('.sg-gantt');
	if (gantt) resizeObserver.observe(gantt);

	schedule();

	return () => {
		if (frame) cancelAnimationFrame(frame);
		window.removeEventListener('resize', schedule);
		resizeObserver.disconnect();
		host.style.height = '';
		if (gantt instanceof HTMLElement) gantt.style.height = '';
	};
}

/** Pin timeline card content to the left edge while horizontally scrolling the gantt. */
export function syncReportTimelineStickyCards(scroller: HTMLElement) {
	const scrollLeft = scroller.scrollLeft;

	for (const task of scroller.querySelectorAll<HTMLElement>('.sg-task.report-timeline-card')) {
		const content = task.querySelector<HTMLElement>('.sg-task-content');
		if (!content) continue;

		const taskLeft = parseFloat(task.style.left) || 0;
		const taskWidth = parseFloat(task.style.width) || 0;
		// Use the card's intrinsic width — .sg-task-content stretches to the bar on wide tasks.
		const card = content.querySelector<HTMLElement>('.rt-card');
		const contentWidth = card?.offsetWidth ?? content.scrollWidth;

		let offset = scrollLeft - taskLeft;
		if (offset < 0) {
			offset = 0;
		} else {
			offset = Math.min(offset, Math.max(0, taskWidth - contentWidth));
		}

		content.style.transform = offset > 0 ? `translateX(${offset}px)` : '';
	}
}

export function attachReportTimelineStickyScroll(
	scroller: HTMLElement,
	onSync: () => void
): () => void {
	let frame = 0;

	const schedule = () => {
		if (frame) return;
		frame = requestAnimationFrame(() => {
			frame = 0;
			onSync();
		});
	};

	scroller.addEventListener('scroll', schedule, { passive: true });
	const resizeObserver = new ResizeObserver(schedule);
	resizeObserver.observe(scroller);

	for (const task of scroller.querySelectorAll('.sg-task.report-timeline-card')) {
		const content = task.querySelector('.sg-task-content');
		if (content) resizeObserver.observe(content);
		const card = task.querySelector('.rt-card');
		if (card) resizeObserver.observe(card);
	}

	schedule();

	return () => {
		if (frame) cancelAnimationFrame(frame);
		scroller.removeEventListener('scroll', schedule);
		resizeObserver.disconnect();
	};
}

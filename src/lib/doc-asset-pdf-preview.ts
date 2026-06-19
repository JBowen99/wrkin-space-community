/** Client-only: render the first PDF page to a PNG data URL for thumbnails. */
export async function renderPdfFirstPageDataUrl(
	fileUrl: string,
	maxWidth: number
): Promise<string> {
	const pdfjs = await import('pdfjs-dist');
	const workerMod = await import('pdfjs-dist/build/pdf.worker.mjs?url');
	pdfjs.GlobalWorkerOptions.workerSrc = workerMod.default;

	const response = await fetch(fileUrl, { credentials: 'include' });
	if (!response.ok) {
		throw new Error('Could not load PDF');
	}

	const data = await response.arrayBuffer();
	const pdf = await pdfjs.getDocument({ data }).promise;
	const page = await pdf.getPage(1);
	const baseViewport = page.getViewport({ scale: 1 });
	const scale = Math.min(2, maxWidth / baseViewport.width);
	const viewport = page.getViewport({ scale });

	const canvas = document.createElement('canvas');
	const context = canvas.getContext('2d');
	if (!context) {
		throw new Error('Canvas not available');
	}

	canvas.width = Math.floor(viewport.width);
	canvas.height = Math.floor(viewport.height);

	await page.render({ canvas, canvasContext: context, viewport }).promise;
	return canvas.toDataURL('image/png');
}

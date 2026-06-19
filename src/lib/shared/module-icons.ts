import type { IconSvgElement } from '@hugeicons/svelte';
import {
	Analytics01Icon,
	BubbleChatIcon,
	Calendar03Icon,
	Comment01Icon,
	JusticeScale01Icon,
	KanbanIcon,
	NotebookIcon,
	Target01Icon,
	Task01Icon
} from '@hugeicons/core-free-icons';
import type { ModuleType } from './modules';

const MODULE_TYPE_ICONS: Record<ModuleType, IconSvgElement> = {
	chat: BubbleChatIcon,
	forum: Comment01Icon,
	calendar: Calendar03Icon,
	cards: KanbanIcon,
	docs: NotebookIcon,
	tasks: Task01Icon,
	okrs: Target01Icon,
	decisions: JusticeScale01Icon,
	reports: Analytics01Icon
};

export function getModuleTypeIcon(type: ModuleType): IconSvgElement {
	return MODULE_TYPE_ICONS[type];
}

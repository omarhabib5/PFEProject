import { Kanban } from '../base/kanban';
/**
 * ColumnDragAndDrop module is used to perform column reordering actions.
 */
export declare class ColumnDragAndDrop {
    private parent;
    private draggedColumn;
    private draggedIndex;
    private targetIndex;
    private isDragging;
    private dragInstance;
    private headerCells;
    private dropIndicator;
    private dragArea;
    private contentCells;
    private isStackedHeader;
    private skeletonElement;
    /**
     * Constructor for column drag and drop module
     *
     * @param {Kanban} parent Accepts the kanban instance
     * @private
     */
    constructor(parent: Kanban);
    wireColumnDragEvents(headerCell: HTMLElement): void;
    private columnDragHelper;
    private columnDragStart;
    private columnDrag;
    private columnDragStop;
    private createColumnSkeleton;
    private showColumnSkeleton;
    private findTargetHeader;
    private getParentStackedHeader;
    private getColumnIndex;
    private isColumnVisible;
    private getVisibleColumns;
    private reorderColumns;
    private reorderStackedHeaders;
    private resetDragState;
    unwireColumnDragEvents(headerCell: HTMLElement): void;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Draggable, formatUnit, createElement, isNullOrUndefined as isNoU, addClass, closest } from '@syncfusion/ej2-base';
import { removeClass, remove } from '@syncfusion/ej2-base';
import * as cls from '../base/css-constant';
import * as events from '../base/constant';
/**
 * ColumnDragAndDrop module is used to perform column reordering actions.
 */
var ColumnDragAndDrop = /** @class */ (function () {
    /**
     * Constructor for column drag and drop module
     *
     * @param {Kanban} parent Accepts the kanban instance
     * @private
     */
    function ColumnDragAndDrop(parent) {
        this.parent = parent;
        this.isDragging = false;
    }
    ColumnDragAndDrop.prototype.wireColumnDragEvents = function (headerCell) {
        this.dragArea = this.parent.element;
        this.dragInstance = new Draggable(headerCell, {
            clone: true,
            dragArea: this.dragArea,
            dragStart: this.columnDragStart.bind(this),
            drag: this.columnDrag.bind(this),
            dragStop: this.columnDragStop.bind(this),
            helper: this.columnDragHelper.bind(this),
            enableTapHold: this.parent.isAdaptive
        });
        if (!this.dropIndicator) {
            this.dropIndicator = createElement('div', {
                className: 'e-kanban-column-indicator'
            });
            document.body.appendChild(this.dropIndicator);
        }
    };
    ColumnDragAndDrop.prototype.columnDragHelper = function (e) {
        var _this = this;
        this.draggedColumn = closest(e.sender.target, '.' + cls.HEADER_CELLS_CLASS);
        if (isNoU(this.draggedColumn)) {
            return null;
        }
        this.isStackedHeader = this.draggedColumn.classList.contains(cls.STACKED_HEADER_CELL_CLASS);
        if (this.isStackedHeader) {
            var stackedHeaderIndex = this.getColumnIndex(this.draggedColumn);
            var stackedHeader = this.parent.stackedHeaders[stackedHeaderIndex];
            var keyFields = stackedHeader.keyFields.split(',').map(function (field) { return field.trim(); });
            this.contentCells = [];
            keyFields.forEach(function (key) {
                var _a;
                var cellsForKey = Array.from(_this.parent.element.querySelectorAll('.e-content-cells[data-key="' + key + '"]'));
                (_a = _this.contentCells).push.apply(_a, cellsForKey);
            });
        }
        else {
            var columnKey = this.draggedColumn.getAttribute('data-key');
            this.contentCells = Array.from(this.parent.element.querySelectorAll('.e-content-cells[data-key="' + columnKey + '"]'));
        }
        addClass([this.draggedColumn], 'e-kanban-dragging-header');
        this.draggedIndex = this.getColumnIndex(this.draggedColumn);
        if (!this.skeletonElement) {
            this.skeletonElement = createElement('div', {
                className: 'e-kanban-column-skeleton'
            });
            document.body.appendChild(this.skeletonElement);
        }
        this.createColumnSkeleton();
        return this.skeletonElement;
    };
    ColumnDragAndDrop.prototype.columnDragStart = function (e) {
        if (!this.parent.allowColumnDragAndDrop) {
            return;
        }
        this.isDragging = true;
        var dragStartArgs = {
            cancel: false,
            event: e,
            element: this.draggedColumn,
            fromIndex: this.draggedIndex,
            column: this.isStackedHeader ? this.parent.stackedHeaders[this.draggedIndex] : this.parent.columns[this.draggedIndex]
        };
        this.parent.trigger(events.columnDragStart, dragStartArgs);
        if (dragStartArgs.cancel) {
            this.resetDragState();
            this.dragInstance.intDestroy(e);
            return;
        }
        addClass([this.draggedColumn], 'e-dragged-header');
        this.contentCells.forEach(function (cell) {
            addClass([cell], 'e-dragged-content');
        });
        this.showColumnSkeleton(e);
    };
    ColumnDragAndDrop.prototype.columnDrag = function (e) {
        if (!this.isDragging) {
            return;
        }
        var targetHeader = this.findTargetHeader(e);
        if (!targetHeader) {
            this.dropIndicator.style.display = 'none';
            return;
        }
        var draggedColumnKey = this.draggedColumn.getAttribute('data-key');
        var targetColumnKey = targetHeader.getAttribute('data-key');
        var draggedParentHeader = this.getParentStackedHeader(draggedColumnKey);
        var targetParentHeader = this.getParentStackedHeader(targetColumnKey);
        if (!this.isStackedHeader && draggedParentHeader) {
            if (!targetParentHeader) {
                this.dropIndicator.style.display = 'none';
                return;
            }
            else if (draggedParentHeader.keyFields !== targetParentHeader.keyFields) {
                this.dropIndicator.style.display = 'none';
                return;
            }
        }
        if (!this.isStackedHeader && draggedParentHeader && targetParentHeader) {
            if (draggedParentHeader.keyFields !== targetParentHeader.keyFields) {
                this.dropIndicator.style.display = 'none';
                return;
            }
        }
        this.targetIndex = this.getColumnIndex(targetHeader);
        var rect = targetHeader.getBoundingClientRect();
        var dragArgs = {
            event: e,
            element: this.draggedColumn,
            fromIndex: this.draggedIndex,
            toIndex: this.targetIndex,
            column: this.isStackedHeader ? this.parent.stackedHeaders[this.draggedIndex] : this.parent.columns[this.draggedIndex]
        };
        this.parent.trigger(events.columnDrag, dragArgs);
        if (dragArgs.cancel) {
            this.resetDragState();
            return;
        }
        this.dropIndicator.style.display = 'block';
        this.dropIndicator.style.left = (rect.left + window.pageXOffset) + 'px';
        this.dropIndicator.style.top = (rect.top + window.pageYOffset) + 'px';
        this.dropIndicator.style.height = rect.height + 'px';
    };
    ColumnDragAndDrop.prototype.columnDragStop = function (e) {
        if (!this.isDragging) {
            return;
        }
        var targetHeader = this.findTargetHeader(e);
        if (!targetHeader) {
            this.resetDragState();
            return;
        }
        var draggedColumnKey = this.draggedColumn.getAttribute('data-key');
        var targetColumnKey = targetHeader.getAttribute('data-key');
        var draggedParentHeader = this.getParentStackedHeader(draggedColumnKey);
        var targetParentHeader = this.getParentStackedHeader(targetColumnKey);
        if (!this.isStackedHeader && draggedParentHeader) {
            if (!targetParentHeader) {
                this.resetDragState();
                return;
            }
            else if (draggedParentHeader.keyFields !== targetParentHeader.keyFields) {
                this.resetDragState();
                return;
            }
        }
        if (!this.isStackedHeader && draggedParentHeader && targetParentHeader) {
            if (draggedParentHeader.keyFields !== targetParentHeader.keyFields) {
                this.resetDragState();
                return;
            }
        }
        var targetIndex = this.getColumnIndex(targetHeader);
        var dropIndex = targetIndex;
        var dropArgs = {
            cancel: false,
            event: e,
            element: this.draggedColumn,
            fromIndex: this.draggedIndex,
            toIndex: targetIndex,
            dropIndex: dropIndex,
            column: this.isStackedHeader ? this.parent.stackedHeaders[this.draggedIndex] : this.parent.columns[this.draggedIndex]
        };
        this.parent.trigger(events.columnDrop, dropArgs);
        if (!dropArgs.cancel && dropIndex !== this.draggedIndex) {
            if (this.isStackedHeader) {
                this.reorderStackedHeaders(this.draggedIndex, targetIndex);
            }
            else {
                this.reorderColumns(this.draggedIndex, targetIndex);
            }
        }
        this.resetDragState();
    };
    ColumnDragAndDrop.prototype.createColumnSkeleton = function () {
        if (!this.skeletonElement || !this.draggedColumn) {
            return;
        }
        this.skeletonElement.innerHTML = '';
        this.skeletonElement.style.display = 'block';
        this.skeletonElement.style.position = 'absolute';
        this.skeletonElement.style.zIndex = '999';
        this.skeletonElement.style.width = formatUnit(this.draggedColumn.offsetWidth);
        // Clone header
        var headerClone = this.draggedColumn.cloneNode(true);
        headerClone.classList.add('e-kanban-skeleton-header');
        this.skeletonElement.appendChild(headerClone);
        // Get the column key
        var columnKey = this.draggedColumn.getAttribute('data-key');
        var calculatedHeigt = this.parent.element.getBoundingClientRect().height;
        // Create content wrapper
        var contentWrapper = createElement('div', {
            className: 'e-kanban-skeleton-content'
        });
        var availableSpace = calculatedHeigt - 16; // 16px for padding
        if (this.isStackedHeader) {
            var cardHeight = this.contentCells[0].childNodes[1].firstChild
                ? this.contentCells[0].childNodes[1].firstChild.offsetHeight : 0;
            var numCards = cardHeight === 0 ? 0 : Math.floor(calculatedHeigt / (cardHeight));
            for (var i = 0; i < numCards; i++) {
                var placeholderCard = createElement('div', {
                    className: 'e-kanban-skeleton-card',
                    styles: 'height: ' + cardHeight + 'px;'
                });
                contentWrapper.appendChild(placeholderCard);
            }
        }
        else {
            var columnModel = this.parent.columns.find(function (col) { return col.keyField.toString() === columnKey; });
            var isCollapsed = columnModel && columnModel.allowToggle && !columnModel.isExpanded;
            if (isCollapsed) {
                // For collapsed columns, create a single placeholder with full content height
                var emptyContainer = createElement('div', {
                    className: 'e-kanban-skeleton-empty-content',
                    styles: 'height: ' + availableSpace + 'px;'
                });
                contentWrapper.appendChild(emptyContainer);
            }
            else {
                // Get the first real card height
                var firstCard = this.parent.element.querySelector('.e-content-cells[data-key="' + columnKey + '"] .e-card');
                var cardHeight = void 0;
                if (firstCard && firstCard.offsetHeight) {
                    cardHeight = Math.min(150, firstCard.offsetHeight); // Max 150px
                }
                var numCards = firstCard === null ? 0 : Math.floor(calculatedHeigt / (cardHeight));
                for (var i = 0; i < numCards; i++) {
                    var placeholderCard = createElement('div', {
                        className: 'e-kanban-skeleton-card',
                        styles: 'height: ' + cardHeight + 'px;'
                    });
                    contentWrapper.appendChild(placeholderCard);
                }
            }
        }
        // Explicitly set the height of the content wrapper to match contentTd height
        contentWrapper.style.height = calculatedHeigt + 'px';
        // Add content wrapper to skeleton
        this.skeletonElement.appendChild(contentWrapper);
        // Set skeleton height to match header + content
        this.skeletonElement.style.height = calculatedHeigt + 'px';
    };
    ColumnDragAndDrop.prototype.showColumnSkeleton = function (e) {
        if (!this.skeletonElement) {
            return;
        }
        if (this.draggedColumn) {
            var headerElement = closest(this.draggedColumn, '.e-kanban-header');
            if (headerElement && this.skeletonElement.parentElement !== headerElement) {
                headerElement.appendChild(this.skeletonElement);
            }
        }
        this.skeletonElement.style.display = 'block';
    };
    ColumnDragAndDrop.prototype.findTargetHeader = function (e) {
        var target = e.target;
        if (this.isStackedHeader) {
            var stackedHeader = closest(target, '.' + cls.STACKED_HEADER_CELL_CLASS);
            if (stackedHeader && stackedHeader !== this.draggedColumn) {
                return stackedHeader;
            }
        }
        else {
            var headerCell = closest(target, '.' + cls.HEADER_CELLS_CLASS);
            if (headerCell && headerCell !== this.draggedColumn) {
                return headerCell;
            }
        }
        return null;
    };
    ColumnDragAndDrop.prototype.getParentStackedHeader = function (columnKey) {
        if (!this.parent.stackedHeaders || this.parent.stackedHeaders.length === 0) {
            return null;
        }
        return this.parent.stackedHeaders.find(function (header) {
            var keyFields = header.keyFields.split(',').map(function (key) { return key.trim(); });
            return keyFields.indexOf(columnKey) !== -1;
        });
    };
    ColumnDragAndDrop.prototype.getColumnIndex = function (headerCell) {
        return Array.from(headerCell.parentElement.children).indexOf(headerCell);
    };
    ColumnDragAndDrop.prototype.isColumnVisible = function (column) {
        return this.parent.enableVirtualization
            ? this.parent.virtualLayoutModule.isColumnVisible(column)
            : this.parent.layoutModule.isColumnVisible(column);
    };
    ColumnDragAndDrop.prototype.getVisibleColumns = function (columns) {
        var _this = this;
        return columns
            .map(function (column, index) { return ({ column: column, index: index }); })
            .filter(function (_a) {
            var column = _a.column;
            return _this.isColumnVisible(column);
        });
    };
    ColumnDragAndDrop.prototype.reorderColumns = function (fromIndex, toIndex) {
        var visibleColumns = this.getVisibleColumns(this.parent.columns);
        var sourceIndex = visibleColumns[fromIndex].index;
        var targetIndex = visibleColumns[toIndex].index;
        var columns = this.parent.columns.slice();
        var column = columns.splice(sourceIndex, 1)[0];
        columns.splice(targetIndex, 0, column);
        this.parent.columns = columns;
        if (this.parent.enableVirtualization) {
            this.parent.virtualLayoutModule.refresh();
        }
        else {
            this.parent.layoutModule.refresh();
        }
    };
    ColumnDragAndDrop.prototype.reorderStackedHeaders = function (sourceIndex, targetIndex) {
        var _this = this;
        var stackedHeadersList = this.parent.stackedHeaders.slice();
        var movingStackedHeader = stackedHeadersList.splice(sourceIndex, 1)[0];
        stackedHeadersList.splice(targetIndex, 0, movingStackedHeader);
        this.parent.stackedHeaders = stackedHeadersList;
        var headerToColumnsMap = new Map();
        stackedHeadersList.forEach(function (header) {
            var keyFields = header.keyFields.split(',').map(function (key) { return key.trim(); });
            headerToColumnsMap.set(header.keyFields, []);
            keyFields.forEach(function (keyField) {
                var columnIndex = _this.parent.columns.findIndex(function (column) {
                    return column.keyField.toString() === keyField;
                });
                if (columnIndex !== -1) {
                    headerToColumnsMap.get(header.keyFields).push({
                        column: _this.parent.columns[columnIndex],
                        index: columnIndex
                    });
                }
            });
        });
        var newColumnsArray = [];
        stackedHeadersList.forEach(function (header) {
            var columnsForHeader = headerToColumnsMap.get(header.keyFields) || [];
            columnsForHeader.sort(function (a, b) {
                return a.index - b.index;
            });
            columnsForHeader.forEach(function (item) {
                newColumnsArray.push(item.column);
            });
        });
        this.parent.columns.forEach(function (column) {
            var isInStackedHeader = stackedHeadersList.some(function (header) {
                var keyFields = header.keyFields.split(',').map(function (key) { return key.trim(); });
                return keyFields.indexOf(column.keyField.toString()) !== -1;
            });
            if (!isInStackedHeader && newColumnsArray.indexOf(column) === -1) {
                newColumnsArray.push(column);
            }
        });
        this.parent.columns = newColumnsArray;
        if (this.parent.enableVirtualization) {
            this.parent.virtualLayoutModule.refresh();
        }
        else {
            this.parent.layoutModule.refresh();
        }
    };
    ColumnDragAndDrop.prototype.resetDragState = function () {
        this.isDragging = false;
        if (this.dropIndicator) {
            this.dropIndicator.style.display = 'none';
        }
        if (this.skeletonElement) {
            this.skeletonElement.style.display = 'none';
        }
        if (this.draggedColumn) {
            removeClass([this.draggedColumn], ['e-kanban-dragging-header', 'e-dragged-header']);
        }
        if (this.contentCells && this.contentCells.length) {
            removeClass(this.contentCells, 'e-dragged-content');
        }
        this.draggedColumn = null;
        this.contentCells = null;
        this.isStackedHeader = false;
    };
    ColumnDragAndDrop.prototype.unwireColumnDragEvents = function (headerCell) {
        if (!isNoU(headerCell)) {
            var ej2Instances = headerCell.ej2_instances;
            if (!isNoU(ej2Instances) && ej2Instances.length > 0) {
                var dragInstance = ej2Instances[0];
                if (dragInstance && !dragInstance.isDestroyed) {
                    dragInstance.destroy();
                }
            }
        }
        // Remove drop indicator if this is the last header being unwired
        if (this.dropIndicator && this.dropIndicator.parentElement) {
            remove(this.dropIndicator);
            this.dropIndicator = null;
        }
        this.resetDragState();
    };
    return ColumnDragAndDrop;
}());
export { ColumnDragAndDrop };

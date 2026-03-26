import { __decorate } from "tslib";
import { Component, ChangeDetectionStrategy, ContentChild } from '@angular/core';
import { ComponentBase, ComponentMixins, setValue } from '@syncfusion/ej2-angular-base';
import { Kanban } from '@syncfusion/ej2-kanban';
import { Template } from '@syncfusion/ej2-angular-base';
import { ColumnsDirective } from './columns.directive';
import { StackedHeadersDirective } from './stackedheaders.directive';
import * as i0 from "@angular/core";
export const inputs = ['allowColumnDragAndDrop', 'allowDragAndDrop', 'allowKeyboard', 'cardHeight', 'cardSettings', 'columns', 'constraintType', 'cssClass', 'dataSource', 'dialogSettings', 'enableHtmlSanitizer', 'enablePersistence', 'enableRtl', 'enableTooltip', 'enableVirtualization', 'externalDropId', 'height', 'keyField', 'locale', 'query', 'showEmptyColumn', 'sortSettings', 'stackedHeaders', 'swimlaneSettings', 'tooltipTemplate', 'width'];
export const outputs = ['actionBegin', 'actionComplete', 'actionFailure', 'cardClick', 'cardDoubleClick', 'cardRendered', 'columnDrag', 'columnDragStart', 'columnDrop', 'created', 'dataBinding', 'dataBound', 'dataSourceChanged', 'dataStateChange', 'dialogClose', 'dialogOpen', 'drag', 'dragStart', 'dragStop', 'queryCellInfo'];
export const twoWays = [''];
/**
 * `ej-kanban` represents the Angular Kanban Component.
 * ```html
 * <ejs-kanban></ejs-kanban>
 * ```
 */
let KanbanComponent = class KanbanComponent extends Kanban {
    constructor(ngEle, srenderer, viewContainerRef, injector) {
        super();
        this.ngEle = ngEle;
        this.srenderer = srenderer;
        this.viewContainerRef = viewContainerRef;
        this.injector = injector;
        this.tags = ['columns', 'stackedHeaders'];
        this.element = this.ngEle.nativeElement;
        this.injectedModules = this.injectedModules || [];
        this.registerEvents(outputs);
        this.addTwoWay.call(this, twoWays);
        setValue('currentInstance', this, this.viewContainerRef);
        this.context = new ComponentBase();
    }
    ngOnInit() {
        this.context.ngOnInit(this);
    }
    ngAfterViewInit() {
        this.context.ngAfterViewInit(this);
    }
    ngOnDestroy() {
        this.context.ngOnDestroy(this);
    }
    ngAfterContentChecked() {
        this.tagObjects[0].instance = this.childColumns;
        if (this.childStackedHeaders) {
            this.tagObjects[1].instance = this.childStackedHeaders;
        }
        this.context.ngAfterContentChecked(this);
    }
};
KanbanComponent.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "13.0.3", ngImport: i0, type: KanbanComponent, deps: [{ token: i0.ElementRef }, { token: i0.Renderer2 }, { token: i0.ViewContainerRef }, { token: i0.Injector }], target: i0.ɵɵFactoryTarget.Component });
KanbanComponent.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "12.0.0", version: "13.0.3", type: KanbanComponent, selector: "ejs-kanban", inputs: { allowColumnDragAndDrop: "allowColumnDragAndDrop", allowDragAndDrop: "allowDragAndDrop", allowKeyboard: "allowKeyboard", cardHeight: "cardHeight", cardSettings: "cardSettings", columns: "columns", constraintType: "constraintType", cssClass: "cssClass", dataSource: "dataSource", dialogSettings: "dialogSettings", enableHtmlSanitizer: "enableHtmlSanitizer", enablePersistence: "enablePersistence", enableRtl: "enableRtl", enableTooltip: "enableTooltip", enableVirtualization: "enableVirtualization", externalDropId: "externalDropId", height: "height", keyField: "keyField", locale: "locale", query: "query", showEmptyColumn: "showEmptyColumn", sortSettings: "sortSettings", stackedHeaders: "stackedHeaders", swimlaneSettings: "swimlaneSettings", tooltipTemplate: "tooltipTemplate", width: "width" }, outputs: { actionBegin: "actionBegin", actionComplete: "actionComplete", actionFailure: "actionFailure", cardClick: "cardClick", cardDoubleClick: "cardDoubleClick", cardRendered: "cardRendered", columnDrag: "columnDrag", columnDragStart: "columnDragStart", columnDrop: "columnDrop", created: "created", dataBinding: "dataBinding", dataBound: "dataBound", dataSourceChanged: "dataSourceChanged", dataStateChange: "dataStateChange", dialogClose: "dialogClose", dialogOpen: "dialogOpen", drag: "drag", dragStart: "dragStart", dragStop: "dragStop", queryCellInfo: "queryCellInfo" }, queries: [{ propertyName: "tooltipTemplate", first: true, predicate: ["tooltipTemplate"], descendants: true }, { propertyName: "columns_template", first: true, predicate: ["columnsTemplate"], descendants: true }, { propertyName: "swimlaneSettings_template", first: true, predicate: ["swimlaneSettingsTemplate"], descendants: true }, { propertyName: "cardSettings_template", first: true, predicate: ["cardSettingsTemplate"], descendants: true }, { propertyName: "dialogSettings_template", first: true, predicate: ["dialogSettingsTemplate"], descendants: true }, { propertyName: "childColumns", first: true, predicate: ColumnsDirective, descendants: true }, { propertyName: "childStackedHeaders", first: true, predicate: StackedHeadersDirective, descendants: true }], usesInheritance: true, ngImport: i0, template: '', isInline: true, changeDetection: i0.ChangeDetectionStrategy.OnPush });
__decorate([
    Template()
], KanbanComponent.prototype, "tooltipTemplate", void 0);
__decorate([
    Template()
], KanbanComponent.prototype, "columns_template", void 0);
__decorate([
    Template()
], KanbanComponent.prototype, "swimlaneSettings_template", void 0);
__decorate([
    Template()
], KanbanComponent.prototype, "cardSettings_template", void 0);
__decorate([
    Template()
], KanbanComponent.prototype, "dialogSettings_template", void 0);
KanbanComponent = __decorate([
    ComponentMixins([ComponentBase])
], KanbanComponent);
export { KanbanComponent };
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "13.0.3", ngImport: i0, type: KanbanComponent, decorators: [{
            type: Component,
            args: [{
                    selector: 'ejs-kanban',
                    inputs: inputs,
                    outputs: outputs,
                    template: '',
                    changeDetection: ChangeDetectionStrategy.OnPush,
                    queries: {
                        childColumns: new ContentChild(ColumnsDirective),
                        childStackedHeaders: new ContentChild(StackedHeadersDirective)
                    }
                }]
        }], ctorParameters: function () { return [{ type: i0.ElementRef }, { type: i0.Renderer2 }, { type: i0.ViewContainerRef }, { type: i0.Injector }]; }, propDecorators: { tooltipTemplate: [{
                type: ContentChild,
                args: ['tooltipTemplate']
            }], columns_template: [{
                type: ContentChild,
                args: ['columnsTemplate']
            }], swimlaneSettings_template: [{
                type: ContentChild,
                args: ['swimlaneSettingsTemplate']
            }], cardSettings_template: [{
                type: ContentChild,
                args: ['cardSettingsTemplate']
            }], dialogSettings_template: [{
                type: ContentChild,
                args: ['dialogSettingsTemplate']
            }] } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2FuYmFuLmNvbXBvbmVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9rYW5iYW4va2FuYmFuLmNvbXBvbmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBTyxFQUFFLFNBQVMsRUFBZ0MsdUJBQXVCLEVBQWlELFlBQVksRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUM5SixPQUFPLEVBQUUsYUFBYSxFQUErQixlQUFlLEVBQTBCLFFBQVEsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQzdJLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUNoRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDeEQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDdkQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNEJBQTRCLENBQUM7O0FBRXJFLE1BQU0sQ0FBQyxNQUFNLE1BQU0sR0FBYSxDQUFDLHdCQUF3QixFQUFDLGtCQUFrQixFQUFDLGVBQWUsRUFBQyxZQUFZLEVBQUMsY0FBYyxFQUFDLFNBQVMsRUFBQyxnQkFBZ0IsRUFBQyxVQUFVLEVBQUMsWUFBWSxFQUFDLGdCQUFnQixFQUFDLHFCQUFxQixFQUFDLG1CQUFtQixFQUFDLFdBQVcsRUFBQyxlQUFlLEVBQUMsc0JBQXNCLEVBQUMsZ0JBQWdCLEVBQUMsUUFBUSxFQUFDLFVBQVUsRUFBQyxRQUFRLEVBQUMsT0FBTyxFQUFDLGlCQUFpQixFQUFDLGNBQWMsRUFBQyxnQkFBZ0IsRUFBQyxrQkFBa0IsRUFBQyxpQkFBaUIsRUFBQyxPQUFPLENBQUMsQ0FBQztBQUNoYixNQUFNLENBQUMsTUFBTSxPQUFPLEdBQWEsQ0FBQyxhQUFhLEVBQUMsZ0JBQWdCLEVBQUMsZUFBZSxFQUFDLFdBQVcsRUFBQyxpQkFBaUIsRUFBQyxjQUFjLEVBQUMsWUFBWSxFQUFDLGlCQUFpQixFQUFDLFlBQVksRUFB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QkFDakU7aUJBQ0o7K0tBbUNVLGVBQWU7c0JBRnJCLFlBQVk7dUJBQUMsaUJBQWlCO2dCQUt4QixnQkFBZ0I7c0JBRnRCLFlBQVk7dUJBQUMsaUJBQWlCO2dCQUt4Qix5QkFBeUI7c0JBRi9CLFlBQVk7dUJBQUMsMEJBQTBCO2dCQUtqQyxxQkFBcUI7c0JBRjNCLFlBQVk7dUJBQUMsc0JBQXNCO2dCQUs3Qix1QkFBdUI7c0JBRjdCLFlBQVk7dUJBQUMsd0JBQXdCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29tcG9uZW50LCBFbGVtZW50UmVmLCBWaWV3Q29udGFpbmVyUmVmLCBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneSwgUXVlcnlMaXN0LCBSZW5kZXJlcjIsIEluamVjdG9yLCBWYWx1ZVByb3ZpZGVyLCBDb250ZW50Q2hpbGQgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IENvbXBvbmVudEJhc2UsIElDb21wb25lbnRCYXNlLCBhcHBseU1peGlucywgQ29tcG9uZW50TWl4aW5zLCBQcm9wZXJ0eUNvbGxlY3Rpb25JbmZvLCBzZXRWYWx1ZSB9IGZyb20gJ0BzeW5jZnVzaW9uL2VqMi1hbmd1bGFyLWJhc2UnO1xuaW1wb3J0IHsgS2FuYmFuIH0gZnJvbSAnQHN5bmNmdXNpb24vZWoyLWthbmJhbic7XG5pbXBvcnQgeyBUZW1wbGF0ZSB9IGZyb20gJ0BzeW5jZnVzaW9uL2VqMi1hbmd1bGFyLWJhc2UnO1xuaW1wb3J0IHsgQ29sdW1uc0RpcmVjdGl2ZSB9IGZyb20gJy4vY29sdW1ucy5kaXJlY3RpdmUnO1xuaW1wb3J0IHsgU3RhY2tlZEhlYWRlcnNEaXJlY3RpdmUgfSBmcm9tICcuL3N0YWNrZWRoZWFkZXJzLmRpcmVjdGl2ZSc7XG5cbmV4cG9ydCBjb25zdCBpbnB1dHM6IHN0cmluZ1tdID0gWydhbGxvd0NvbHVtbkRyYWdBbmREcm9wJywnYWxsb3dEcmFnQW5kRHJvcCcsJ2FsbG93S2V5Ym9hcmQnLCdjYXJkSGVpZ2h0JywnY2FyZFNldHRpbmdzJywnY29sdW1ucycsJ2NvbnN0cmFpbnRUeXBlJywnY3NzQ2xhc3MnLCdkYXRhU291cmNlJywnZGlhbG9nU2V0dGluZ3MnLCdlbmFibGVIdG1sU2FuaXRpemVyJywnZW5hYmxlUGVyc2lzdGVuY2UnLCdlbmFibGVSdGwnLCdlbmFibGVUb29sdGlwJywnZW5hYmxlVmlydHVhbGl6YXRpb24nLCdleHRlcm5hbERyb3BJZCcsJ2hlaWdodCcsJ2tleUZpZWxkJywnbG9jYWxlJywncXVlcnknLCdzaG93RW1wdHlDb2x1bW4nLCdzb3J0U2V0dGluZ3MnLCdzdGFja2VkSGVhZGVycycsJ3N3aW1sYW5lU2V0dGluZ3MnLCd0b29sdGlwVGVtcGxhdGUnLCd3aWR0aCddO1xuZXhwb3J0IGNvbnN0IG91dHB1dHM6IHN0cmluZ1tdID0gWydhY3Rpb25CZWdpbicsJ2FjdGlvbkNvbXBsZXRlJywnYWN0aW9uRmFpbHVyZScsJ2NhcmRDbGljaycsJ2NhcmREb3VibGVDbGljaycsJ2NhcmRSZW5kZXJlZCcsJ2NvbHVtbkRyYWcnLCdjb2x1bW5EcmFnU3RhcnQnLCdjb2x1bW5Ecm9wJywnY3JlYXRlZCcsJ2RhdGFCaW5kaW5nJywnZGF0YUJvdW5kJywnZGF0YVNvdXJjZUNoYW5nZWQnLCdkYXRhU3RhdGVDaGFuZ2UnLCdkaWFsb2dDbG9zZScsJ2RpYWxvZ09wZW4nLCdkcmFnJywnZHJhZ1N0YXJ0JywnZHJhZ1N0b3AnLCdxdWVyeUNlbGxJbmZvJ107XG5leHBvcnQgY29uc3QgdHdvV2F5czogc3RyaW5nW10gPSBbJyddO1xuXG4vKipcbiAqIGBlai1rYW5iYW5gIHJlcHJlc2VudHMgdGhlIEFuZ3VsYXIgS2FuYmFuIENvbXBvbmVudC5cbiAqIGBgYGh0bWxcbiAqIDxlanMta2FuYmFuPjwvZWpzLWthbmJhbj5cbiAqIGBgYFxuICovXG5AQ29tcG9uZW50KHtcbiAgICBzZWxlY3RvcjogJ2Vqcy1rYW5iYW4nLFxuICAgIGlucHV0czogaW5wdXRzLFxuICAgIG91dHB1dHM6IG91dHB1dHMsXG4gICAgdGVtcGxhdGU6ICcnLFxuICAgIGNoYW5nZURldGVjdGlvbjogQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3kuT25QdXNoLFxuICAgIHF1ZXJpZXM6IHtcbiAgICAgICAgY2hpbGRDb2x1bW5zOiBuZXcgQ29udGVudENoaWxkKENvbHVtbnNEaXJlY3RpdmUpLCBcbiAgICAgICAgY2hpbGRTdGFja2VkSGVhZGVyczogbmV3IENvbnRlbnRDaGlsZChTdGFja2VkSGVhZGVyc0RpcmVjdGl2ZSlcbiAgICB9XG59KVxuQENvbXBvbmVudE1peGlucyhbQ29tcG9uZW50QmFzZV0pXG5leHBvcnQgY2xhc3MgS2FuYmFuQ29tcG9uZW50IGV4dGVuZHMgS2FuYmFuIGltcGxlbWVudHMgSUNvbXBvbmVudEJhc2Uge1xuICAgIHB1YmxpYyBjb250ZXh0IDogYW55O1xuICAgIHB1YmxpYyB0YWdPYmplY3RzOiBhbnk7XG5cdGFjdGlvbkJlZ2luOiBhbnk7XG5cdGFjdGlvbkNvbXBsZXRlOiBhbnk7XG5cdGFjdGlvbkZhaWx1cmU6IGFueTtcblx0Y2FyZENsaWNrOiBhbnk7XG5cdGNhcmREb3VibGVDbGljazogYW55O1xuXHRjYXJkUmVuZGVyZWQ6IGFueTtcblx0Y29sdW1uRHJhZzogYW55O1xuXHRjb2x1bW5EcmFnU3RhcnQ6IGFueTtcblx0Y29sdW1uRHJvcDogYW55O1xuXHRjcmVhdGVkOiBhbnk7XG5cdGRhdGFCaW5kaW5nOiBhbnk7XG5cdGRhdGFCb3VuZDogYW55O1xuXHRkYXRhU291cmNlQ2hhbmdlZDogYW55O1xuXHRkYXRhU3RhdGVDaGFuZ2U6IGFueTtcblx0ZGlhbG9nQ2xvc2U6IGFueTtcblx0ZGlhbG9nT3BlbjogYW55O1xuXHRkcmFnOiBhbnk7XG5cdGRyYWdTdGFydDogYW55O1xuXHRkcmFnU3RvcDogYW55O1xuXHRwdWJsaWMgcXVlcnlDZWxsSW5mbzogYW55O1xuICAgIHB1YmxpYyBjaGlsZENvbHVtbnM6IFF1ZXJ5TGlzdDxDb2x1bW5zRGlyZWN0aXZlPjtcbiAgICBwdWJsaWMgY2hpbGRTdGFja2VkSGVhZGVyczogUXVlcnlMaXN0PFN0YWNrZWRIZWFkZXJzRGlyZWN0aXZlPjtcbiAgICBwdWJsaWMgdGFnczogc3RyaW5nW10gPSBbJ2NvbHVtbnMnLCAnc3RhY2tlZEhlYWRlcnMnXTtcbiAgICAvKiogXG4gICAgICogRGVmaW5lcyB0aGUgdGVtcGxhdGUgY29udGVudCB0byBjYXJk4oCZcyB0b29sdGlwLiBUaGUgcHJvcGVydHkgd29ya3MgYnkgZW5hYmxpbmcgdGhlIOKAmGVuYWJsZVRvb2x0aXDigJkgcHJvcGVydHkuXG4gICAgICogQGRlZmF1bHQgbnVsbFxuICAgICAqIEBhc3B0eXBlIHN0cmluZ1xuICAgICAqL1xuICAgIEBDb250ZW50Q2hpbGQoJ3Rvb2x0aXBUZW1wbGF0ZScpXG4gICAgQFRlbXBsYXRlKClcbiAgICBwdWJsaWMgdG9vbHRpcFRlbXBsYXRlOiBhbnk7XG4gICAgQENvbnRlbnRDaGlsZCgnY29sdW1uc1RlbXBsYXRlJylcbiAgICBAVGVtcGxhdGUoKVxuICAgIHB1YmxpYyBjb2x1bW5zX3RlbXBsYXRlOiBhbnk7XG4gICAgQENvbnRlbnRDaGlsZCgnc3dpbWxhbmVTZXR0aW5nc1RlbXBsYXRlJylcbiAgICBAVGVtcGxhdGUoKVxuICAgIHB1YmxpYyBzd2ltbGFuZVNldHRpbmdzX3RlbXBsYXRlOiBhbnk7XG4gICAgQENvbnRlbnRDaGlsZCgnY2FyZFNldHRpbmdzVGVtcGxhdGUnKVxuICAgIEBUZW1wbGF0ZSgpXG4gICAgcHVibGljIGNhcmRTZXR0aW5nc190ZW1wbGF0ZTogYW55O1xuICAgIEBDb250ZW50Q2hpbGQoJ2RpYWxvZ1NldHRpbmdzVGVtcGxhdGUnKVxuICAgIEBUZW1wbGF0ZSgpXG4gICAgcHVibGljIGRpYWxvZ1NldHRpbmdzX3RlbXBsYXRlOiBhbnk7XG5cbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIG5nRWxlOiBFbGVtZW50UmVmLCBwcml2YXRlIHNyZW5kZXJlcjogUmVuZGVyZXIyLCBwcml2YXRlIHZpZXdDb250YWluZXJSZWY6Vmlld0NvbnRhaW5lclJlZiwgcHJpdmF0ZSBpbmplY3RvcjogSW5qZWN0b3IpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5lbGVtZW50ID0gdGhpcy5uZ0VsZS5uYXRpdmVFbGVtZW50O1xuICAgICAgICB0aGlzLmluamVjdGVkTW9kdWxlcyA9IHRoaXMuaW5qZWN0ZWRNb2R1bGVzIHx8IFtdO1xuXG4gICAgICAgIHRoaXMucmVnaXN0ZXJFdmVudHMob3V0cHV0cyk7XG4gICAgICAgIHRoaXMuYWRkVHdvV2F5LmNhbGwodGhpcywgdHdvV2F5cyk7XG4gICAgICAgIHNldFZhbHVlKCdjdXJyZW50SW5zdGFuY2UnLCB0aGlzLCB0aGlzLnZpZXdDb250YWluZXJSZWYpO1xuICAgICAgICB0aGlzLmNvbnRleHQgID0gbmV3IENvbXBvbmVudEJhc2UoKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgbmdPbkluaXQoKSB7XG4gICAgICAgIHRoaXMuY29udGV4dC5uZ09uSW5pdCh0aGlzKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgbmdBZnRlclZpZXdJbml0KCk6IHZvaWQge1xuICAgICAgICB0aGlzLmNvbnRleHQubmdBZnRlclZpZXdJbml0KHRoaXMpO1xuICAgIH1cblxuICAgIHB1YmxpYyBuZ09uRGVzdHJveSgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5jb250ZXh0Lm5nT25EZXN0cm95KHRoaXMpO1xuICAgIH1cblxuICAgIHB1YmxpYyBuZ0FmdGVyQ29udGVudENoZWNrZWQoKTogdm9pZCB7XG4gICAgICAgIHRoaXMudGFnT2JqZWN0c1swXS5pbnN0YW5jZSA9IHRoaXMuY2hpbGRDb2x1bW5zO1xuICAgICAgICBpZiAodGhpcy5jaGlsZFN0YWNrZWRIZWFkZXJzKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGFnT2JqZWN0c1sxXS5pbnN0YW5jZSA9IHRoaXMuY2hpbGRTdGFja2VkSGVhZGVycyBhcyBhbnk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICB0aGlzLmNvbnRleHQubmdBZnRlckNvbnRlbnRDaGVja2VkKHRoaXMpO1xuICAgIH1cblxuICAgIHB1YmxpYyByZWdpc3RlckV2ZW50czogKGV2ZW50TGlzdDogc3RyaW5nW10pID0+IHZvaWQ7XG4gICAgcHVibGljIGFkZFR3b1dheTogKHByb3BMaXN0OiBzdHJpbmdbXSkgPT4gdm9pZDtcbn1cblxuIl19
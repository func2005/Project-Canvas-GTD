import { useCallback } from 'react';
import { debounce } from 'lodash';
import clsx from 'clsx';
import type { RxDocument } from 'rxdb';
import type { CanvasWidget, DataItem } from '@/shared/api/db';
import { useRxQuery } from '@/shared/api/hooks/useRxDB';

interface DetailInspectorProps {
    widget: RxDocument<CanvasWidget>;
}

export const DetailInspector: React.FC<DetailInspectorProps> = ({ widget }) => {
    // Use useRxQuery to get the live widget document
    // This ensures we always have the latest state from DB, regardless of prop updates
    const widgetDocs = useRxQuery<CanvasWidget>('widgets', {
        selector: {
            id: widget.id
        }
    });

    const currentWidget = widgetDocs[0] || widget;
    const itemId = currentWidget.data_source_config?.item_id;

    const query = {
        selector: {
            id: itemId || 'non-existent-id'
        }
    };

    const items = useRxQuery<DataItem>('items', query);
    const item = items[0];

    // Auto-save handler
    const saveChanges = useCallback(
        debounce(async (doc: RxDocument<DataItem>, changes: Partial<DataItem>) => {
            await (doc as any).incrementalPatch({
                ...changes,
                updated_at: new Date().toISOString()
            });
        }, 1000),
        []
    );

    if (!itemId) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400 text-sm p-4 text-center">
                Select an item to view details
            </div>
        );
    }

    if (!item) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400 text-sm p-4 text-center">
                Item not found ({itemId})
            </div>
        );
    }

    // @ts-ignore
    const isEditing = currentWidget.view_state?.is_flipped;
    const isEvent = item.entity_type === 'event';

    if (isEditing) {
        return (
            <div
                key={item.id} // Force re-render when item changes to update defaultValues
                className="flex flex-col h-full bg-white overflow-y-auto p-4 space-y-4"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-gray-700">Edit {isEvent ? 'Event' : 'Task'}</h3>
                    <button
                        onClick={async () => {
                            await widget.patch({
                                view_state: {
                                    ...widget.view_state,
                                    // @ts-ignore
                                    is_flipped: false
                                }
                            });
                        }}
                        className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600"
                    >
                        Done
                    </button>
                </div>

                {/* Title */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
                    <input
                        defaultValue={item.title}
                        onChange={(e) => saveChanges(item, { title: e.target.value })}
                        className="w-full text-lg font-bold border-b border-gray-200 focus:border-blue-500 outline-none pb-1"
                    />
                </div>

                {isEvent ? (
                    /* Event Specific Fields */
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Start Time</label>
                            <input
                                type="datetime-local"
                                defaultValue={item.start_time ? new Date(item.start_time).toISOString().slice(0, 16) : ''}
                                onChange={(e) => saveChanges(item, { start_time: e.target.value ? new Date(e.target.value).toISOString() : null })}
                                className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1 text-sm outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">End Time</label>
                            <input
                                type="datetime-local"
                                defaultValue={item.end_time ? new Date(item.end_time).toISOString().slice(0, 16) : ''}
                                onChange={(e) => saveChanges(item, { end_time: e.target.value ? new Date(e.target.value).toISOString() : null })}
                                className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1 text-sm outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>
                ) : (
                    /* Task Specific Fields */
                    <>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                            <select
                                defaultValue={item.system_status}
                                onChange={(e) => saveChanges(item, { system_status: e.target.value as any })}
                                className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1 text-sm outline-none focus:border-blue-500"
                            >
                                <option value="active">Active</option>
                                <option value="completed">Completed</option>
                                <option value="archived">Archived</option>
                                <option value="dropped">Dropped</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Do Date</label>
                                <input
                                    type="date"
                                    defaultValue={item.do_date || ''}
                                    onChange={(e) => saveChanges(item, { do_date: e.target.value || null })}
                                    className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1 text-sm outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Due Date</label>
                                <input
                                    type="datetime-local"
                                    defaultValue={item.due_date ? item.due_date.slice(0, 16) : ''}
                                    onChange={(e) => saveChanges(item, { due_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
                                    className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1 text-sm outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>
                    </>
                )}

                {/* Content */}
                <div className="flex-1 flex flex-col min-h-[100px]">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
                    <textarea
                        defaultValue={item.properties?.content || ''}
                        onChange={(e) => saveChanges(item, { properties: { ...item.properties, content: e.target.value } })}
                        className="flex-1 w-full bg-gray-50 border border-gray-200 rounded p-2 text-sm resize-none focus:ring-1 focus:ring-blue-500 outline-none"
                        placeholder="Add notes..."
                    />
                </div>
            </div>
        );
    }

    // View Mode
    return (
        <div className="flex flex-col h-full bg-white overflow-y-auto p-4 space-y-4" onMouseDown={(e) => e.stopPropagation()}>
            <div className="border-b border-gray-100 pb-2">
                <div className="flex items-center gap-2 mb-1">
                    <span className={clsx(
                        "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                        isEvent ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                    )}>
                        {isEvent ? 'Event' : 'Task'}
                    </span>
                    {item.system_status === 'completed' && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                            Completed
                        </span>
                    )}
                </div>
                <h2 className="text-xl font-bold text-gray-800 leading-tight">{item.title}</h2>

                <div className="flex flex-col gap-1 mt-3 text-xs text-gray-500">
                    {isEvent ? (
                        <>
                            {item.start_time && (
                                <div><span className="font-medium text-gray-700">Start:</span> {new Date(item.start_time).toLocaleString()}</div>
                            )}
                            {item.end_time && (
                                <div><span className="font-medium text-gray-700">End:</span> {new Date(item.end_time).toLocaleString()}</div>
                            )}
                        </>
                    ) : (
                        <>
                            {item.do_date && (
                                <div><span className="font-medium text-gray-700">Do Date:</span> {item.do_date}</div>
                            )}
                            {item.due_date && (
                                <div><span className="font-medium text-gray-700">Due Date:</span> {new Date(item.due_date).toLocaleString()}</div>
                            )}
                            {item.completed_at && (
                                <div><span className="font-medium text-gray-700">Achieved:</span> {new Date(item.completed_at).toLocaleString()}</div>
                            )}
                        </>
                    )}
                </div>
            </div>

            <div className="flex-1 text-sm text-gray-600 whitespace-pre-wrap">
                {item.properties?.content || <span className="italic text-gray-400">No notes provided.</span>}
            </div>

            {item.updated_at && (
                <div className="text-[10px] text-gray-400 pt-2 border-t border-gray-50">
                    Last updated: {new Date(item.updated_at).toLocaleString()}
                </div>
            )}
        </div>
    );
};

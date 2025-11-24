import React from 'react';
import { format } from 'date-fns';
import clsx from 'clsx';
import type { RxDocument } from 'rxdb';
import type { CanvasWidget } from '@/shared/api/db';
import { useRxQuery } from '@/shared/api/hooks/useRxDB';
import { DataItem } from '@/shared/api/db';

interface ProjectHeaderProps {
    widget: RxDocument<CanvasWidget>;
}

export const ProjectHeader: React.FC<ProjectHeaderProps> = ({ widget }) => {
    const projectId = widget.data_source_config?.project_id;
    const selectedDate = widget.data_source_config?.selected_date;
    const dateGranularity = widget.data_source_config?.date_granularity;

    // Query project details
    const projectDocs = useRxQuery<DataItem>('items', {
        selector: {
            id: projectId || 'non-existent'
        }
    });
    const project = projectDocs[0];

    // Build task query based on mode (date or project)
    const taskSelector: any = {
        entity_type: 'task',
        is_deleted: false
    };

    // Date mode: filter by date only (no project filter)
    if (selectedDate) {
        if (dateGranularity === 'month') {
            // Month filter: do_date starts with "YYYY-MM"
            taskSelector.do_date = { $regex: `^${selectedDate}` };
        } else {
            // Day filter: exact match
            taskSelector.do_date = selectedDate;
        }
    }
    // Project mode: filter by project
    else if (projectId) {
        taskSelector['properties.project_id'] = projectId;
    }

    // Query tasks
    const tasks = useRxQuery<DataItem>('items', {
        selector: taskSelector
    });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.system_status === 'completed').length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // @ts-ignore
    const isEditing = widget.view_state?.is_flipped;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const updates: any = {
            title: formData.get('title'),
            system_status: formData.get('status'),
            properties: {
                ...project?.properties,
                content: formData.get('content')
            }
        };

        const start = formData.get('start_time');
        const due = formData.get('due_date');

        if (start) updates.start_time = new Date(start as string).toISOString();
        if (due) updates.due_date = due as string;

        await (project as any).incrementalPatch(updates);

        // Flip back to view mode
        await widget.patch({
            view_state: {
                ...widget.view_state,
                // @ts-ignore
                is_flipped: false
            }
        });
    };

    if (!project && !selectedDate) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400 text-sm">
                Project not found
            </div>
        );
    }

    if (isEditing && project) {
        return (
            <div className="w-full h-full bg-white p-4 overflow-y-auto">
                <form onSubmit={handleSave} className="flex flex-col gap-3 h-full">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-gray-700">Edit Project</h3>
                        <button type="submit" className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600">
                            Save
                        </button>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
                        <input
                            name="title"
                            defaultValue={project.title}
                            className="w-full border rounded p-1 text-sm font-bold"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                            <select name="status" defaultValue={project.system_status} className="w-full border rounded p-1 text-xs">
                                <option value="active">Active</option>
                                <option value="completed">Completed</option>
                                <option value="dropped">Dropped</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Due Date</label>
                            <input
                                type="date"
                                name="due_date"
                                defaultValue={project.due_date ? format(new Date(project.due_date), 'yyyy-MM-dd') : ''}
                                className="w-full border rounded p-1 text-xs"
                            />
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
                        <textarea
                            name="content"
                            defaultValue={project.properties?.content}
                            className="flex-1 w-full border rounded p-2 text-sm resize-none"
                            placeholder="Project description..."
                        />
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="w-full h-full bg-white p-4 flex flex-col justify-center">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    {/* Date mode: show date as title */}
                    {selectedDate ? (
                        <h1 className="text-2xl font-bold text-gray-800">
                            {dateGranularity === 'month'
                                ? format(new Date(selectedDate + '-01'), 'MMMM yyyy')
                                : format(new Date(selectedDate), 'MMMM d, yyyy')
                            }
                        </h1>
                    ) : (
                        /* Project mode: show project name */
                        <h1 className="text-2xl font-bold text-gray-800">{project?.title || 'Project'}</h1>
                    )}
                </div>
                <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    {completedTasks}/{totalTasks}
                </span>
            </div>

            {/* Metadata Row - only show in project mode */}
            {!selectedDate && project && (
                <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                    <div className="flex items-center gap-1">
                        <span className="font-medium">Status:</span>
                        <span className={clsx(
                            "px-1.5 py-0.5 rounded capitalize",
                            project.system_status === 'active' ? "bg-green-100 text-green-700" :
                                project.system_status === 'completed' ? "bg-blue-100 text-blue-700" :
                                    "bg-gray-100 text-gray-700"
                        )}>
                            {project.system_status}
                        </span>
                    </div>
                    {project.start_time && (
                        <div>
                            <span className="font-medium">Start:</span> {format(new Date(project.start_time), 'MMM d, yyyy')}
                        </div>
                    )}
                    {project.due_date && (
                        <div>
                            <span className="font-medium">Due:</span> {format(new Date(project.due_date), 'MMM d, yyyy')}
                        </div>
                    )}
                </div>
            )}

            {/* Progress Bar */}
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                <div
                    className="h-full bg-blue-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Notes - show in both modes if project exists */}
            {project && (
                <div className="flex-1 overflow-y-auto bg-gray-50 rounded p-2 text-sm text-gray-600 whitespace-pre-wrap">
                    <div className="font-medium text-xs text-gray-400 mb-1 uppercase tracking-wider">Notes</div>
                    {project.properties?.content || <span className="italic text-gray-400">No notes provided.</span>}
                </div>
            )}

            {/* Date mode: show task list preview (only in date mode when no project) */}
            {selectedDate && !project && (
                <div className="flex-1 overflow-y-auto">
                    <div className="text-sm text-gray-600">
                        <div className="font-medium text-xs text-gray-400 mb-2 uppercase tracking-wider">Tasks for this {dateGranularity === 'month' ? 'month' : 'day'}</div>
                        {tasks.length > 0 ? (
                            <div className="space-y-1">
                                {tasks.slice(0, 10).map(task => (
                                    <div key={task.id} className="flex items-center gap-2 text-xs">
                                        <span className={task.system_status === 'completed' ? 'line-through text-gray-400' : ''}>
                                            {task.title}
                                        </span>
                                    </div>
                                ))}
                                {tasks.length > 10 && (
                                    <div className="text-xs text-gray-400 italic">
                                        ... and {tasks.length - 10} more tasks
                                    </div>
                                )}
                            </div>
                        ) : (
                            <span className="italic text-gray-400 text-sm">No tasks for this {dateGranularity === 'month' ? 'month' : 'day'}</span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

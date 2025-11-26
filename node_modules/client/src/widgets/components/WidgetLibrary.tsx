import { useState } from 'react';
import { Plus, Calendar, List, FileText, Trash2, Grid, Type, Clock } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { dbService } from '@/shared/api/db';

const WIDGET_TYPES = [
    { type: 'project_hub', label: 'Project Header', icon: Type, w: 0, h: 0 },
    { type: 'inbox', label: 'Inbox (Smart List)', icon: List, w: 300, h: 400 },
    { type: 'calendar_master', label: 'Master Calendar', icon: Calendar, w: 600, h: 500 },
    { type: 'smart_list', label: 'Smart List', icon: List, w: 300, h: 400 },
    { type: 'detail', label: 'Detail Inspector', icon: FileText, w: 300, h: 400 },
    { type: 'archive_bin', label: 'Archive Bin', icon: Trash2, w: 200, h: 200 },
    { type: 'matrix', label: 'Eisenhower Matrix', icon: Grid, w: 500, h: 500 },
    { type: 'timeline', label: 'Timeline', icon: Clock, w: 800, h: 400 },
];

export const WidgetLibrary = () => {
    const [isOpen, setIsOpen] = useState(false);

    const handleAddWidget = async (type: string, w: number, h: number, extraConfig: any = {}) => {
        try {
            const db = dbService.getDatabase();

            // Calculate position based on current viewport
            let x = 100;
            let y = 100;

            try {
                const savedState = localStorage.getItem('canvas_transform_state');
                if (savedState) {
                    const { scale, positionX, positionY } = JSON.parse(savedState);

                    // Target: Center horizontally, Top 20% vertically
                    const viewportCenterX = window.innerWidth / 2;
                    const viewportTopY = window.innerHeight * 0.2;

                    // Convert to canvas coordinates: (screen - pan) / scale
                    x = (viewportCenterX - positionX) / scale - (w / 2);
                    y = (viewportTopY - positionY) / scale;
                }
            } catch (e) {
                console.error('Failed to calculate widget position', e);
            }

            if (type === 'project_hub') {
                // Create Project Item
                const projectId = uuidv4();
                await db.items.insert({
                    id: projectId,
                    title: 'New Project',
                    entity_type: 'project',
                    system_status: 'active',
                    created_at: Date.now(),
                    updated_at: new Date().toISOString(),
                    is_deleted: false,
                    user_id: 'user_1',
                    properties: { content: 'Project description goes here.' }
                });

                // 1. Header
                await db.widgets.insert({
                    id: uuidv4(),
                    canvas_id: 'default_canvas',
                    widget_type: 'project_header',
                    geometry: { x, y, w: 600, h: 150, z: 100 },
                    data_source_config: { project_id: projectId, title: 'Project Header' },
                    updated_at: new Date().toISOString(),
                    is_deleted: false
                });

                // 2. Calendar
                await db.widgets.insert({
                    id: uuidv4(),
                    canvas_id: 'default_canvas',
                    widget_type: 'calendar_master',
                    geometry: { x, y: y + 160, w: 600, h: 400, z: 100 },
                    data_source_config: { project_id: projectId, title: 'Project Calendar' },
                    updated_at: new Date().toISOString(),
                    is_deleted: false
                });

                // 3. List
                await db.widgets.insert({
                    id: uuidv4(),
                    canvas_id: 'default_canvas',
                    widget_type: 'smart_list',
                    geometry: { x: x + 610, y: y + 160, w: 300, h: 400, z: 100 },
                    data_source_config: {
                        criteria: { 'properties.project_id': projectId },
                        title: 'Project Actions'
                    },
                    updated_at: new Date().toISOString(),
                    is_deleted: false
                });

            } else {
                // Standard Widget
                await db.widgets.insert({
                    id: uuidv4(),
                    canvas_id: 'default_canvas',
                    widget_type: type as any,
                    geometry: { x, y, w, h, z: 100 },
                    data_source_config: extraConfig,
                    updated_at: new Date().toISOString(),
                    is_deleted: false
                });
            }

            setIsOpen(false);
        } catch (error) {
            console.error('Failed to add widget:', error);
            alert('Failed to add widget');
        }
    };

    return (
        <div className="absolute top-4 left-4 z-50 font-sans">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg shadow-lg hover:bg-gray-50 border border-gray-200 font-medium transition-colors"
            >
                <Plus size={18} />
                <span>Add Widget</span>
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Component Library
                    </div>
                    <div className="p-1 max-h-[80vh] overflow-y-auto">
                        {WIDGET_TYPES.map((item) => (
                            <button
                                key={item.type}
                                onClick={() => {
                                    if (item.type === 'inbox') {
                                        handleAddWidget('smart_list', item.w, item.h, {
                                            criteria: { do_date: null, system_status: 'active' },
                                            title: 'Inbox'
                                        });
                                    } else {
                                        handleAddWidget(item.type, item.w, item.h);
                                    }
                                }}
                                className="w-full flex items-center gap-3 p-2 hover:bg-blue-50 rounded text-left transition-colors group"
                            >
                                <div className="p-2 bg-gray-100 rounded group-hover:bg-blue-100 text-gray-600 group-hover:text-blue-600 transition-colors">
                                    <item.icon size={18} />
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-gray-700 group-hover:text-blue-700">
                                        {item.label}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        {item.w}x{item.h}px
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

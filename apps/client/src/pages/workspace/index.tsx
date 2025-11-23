import { useState } from 'react';
import { CanvasBoard } from '@/widgets/canvas/CanvasBoard';
import { seedPhase2Canvas } from '@/shared/api/debug/seedPhase2';
import { verifyPhase3 } from '@/shared/api/debug/verifyPhase3';
import { verifyPhase4 } from '@/shared/api/debug/verifyPhase4';
import { verifyPhase6 } from '@/shared/api/debug/verifyPhase6';
import { dbService } from '@/shared/api/db';
import { WidgetLibrary } from '@/widgets/components/WidgetLibrary';

export const WorkspacePage = () => {
    const [isSeeding, setIsSeeding] = useState(false);
    const [showControls, setShowControls] = useState(true);

    const handleSeed = async () => {
        setIsSeeding(true);
        try {
            await dbService.initialize();
            await seedPhase2Canvas();
            alert('Canvas seeded successfully! Check console for details.');
        } catch (error) {
            alert('Failed to seed canvas: ' + String(error));
        } finally {
            setIsSeeding(false);
        }
    };

    const handleClearAll = async () => {
        if (!confirm('Are you sure you want to clear all widgets?')) return;

        try {
            await dbService.initialize();
            const db = dbService.getDatabase();
            const widgets = await db.widgets.find().exec();

            for (const widget of widgets) {
                await widget.remove();
            }

            alert(`Cleared ${widgets.length} widgets`);
        } catch (error) {
            alert('Failed to clear widgets: ' + String(error));
        }
    };

    return (
        <div className="relative w-screen h-screen">
            {/* Canvas */}
            <CanvasBoard />

            {/* Widget Library */}
            <WidgetLibrary />

            {/* Floating Controls */}
            {showControls && (
                <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 space-y-2 z-50">
                    <h3 className="font-bold text-sm text-gray-700 mb-2">Phase 2 Controls</h3>

                    <button
                        onClick={handleSeed}
                        disabled={isSeeding}
                        className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                    >
                        {isSeeding ? 'Seeding...' : '🎨 Seed Canvas'}
                    </button>

                    <button
                        onClick={handleClearAll}
                        className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm font-medium transition-colors"
                    >
                        🗑️ Clear All
                    </button>

                    <div className="border-t border-gray-200 my-2"></div>

                    <h3 className="font-bold text-sm text-gray-700 mb-2">Phase 3 Controls</h3>
                    <button
                        onClick={async () => {
                            try {
                                await dbService.initialize();
                                await verifyPhase3();
                                alert('Phase 3 verification data seeded!');
                            } catch (e) {
                                alert('Error: ' + String(e));
                            }
                        }}
                        className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm font-medium transition-colors"
                    >
                        🧪 Verify Phase 3
                    </button>

                    <h3 className="font-bold text-sm text-gray-700 my-2">Phase 4 Controls</h3>
                    <button
                        onClick={async () => {
                            try {
                                await verifyPhase4();
                                alert('Phase 4 verification complete! Check console for details.');
                            } catch (e) {
                                alert('Error: ' + String(e));
                            }
                        }}
                        className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm font-medium transition-colors"
                    >
                        🔗 Verify Phase 4 (Signals)
                    </button>

                    <h3 className="font-bold text-sm text-gray-700 my-2">Phase 6 Controls</h3>
                    <button
                        onClick={async () => {
                            try {
                                await verifyPhase6();
                                alert('Phase 6 verification complete! Check console for details.');
                            } catch (e) {
                                alert('Error: ' + String(e));
                            }
                        }}
                        className="w-full px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 text-sm font-medium transition-colors"
                    >
                        🔄 Verify Phase 6 (Drag & Logic)
                    </button>

                    <button
                        onClick={() => setShowControls(false)}
                        className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm font-medium transition-colors mt-4"
                    >
                        Hide Controls
                    </button>

                    <div className="pt-2 border-t border-gray-200 text-xs text-gray-500">
                        <p>💡 Tips:</p>
                        <ul className="list-disc list-inside space-y-1 mt-1">
                            <li>Drag header to move</li>
                            <li>Drag edges to resize</li>
                            <li>📌 Pin to lock</li>
                            <li>Scroll to zoom</li>
                        </ul>
                    </div>
                </div>
            )}

            {/* Show Controls Toggle (when hidden) */}
            {!showControls && (
                <button
                    onClick={() => setShowControls(true)}
                    className="absolute top-4 right-4 px-4 py-2 bg-blue-500 text-white rounded-lg shadow-lg hover:bg-blue-600 z-50 font-medium"
                >
                    ⚙️ Show Controls
                </button>
            )}
        </div>
    );
};

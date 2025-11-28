import { CanvasBoard } from '@/widgets/canvas/CanvasBoard';
import { WidgetLibrary } from '@/widgets/components/WidgetLibrary';

export const WorkspacePage = () => {
    return (
        <div className="relative w-screen h-screen">
            {/* Canvas */}
            <CanvasBoard />

            {/* Widget Library */}
            <WidgetLibrary />
        </div>
    );
};

import { MasterCalendar } from './components/MasterCalendar';
import { SmartList } from './components/SmartList';
import { DetailInspector } from './components/DetailInspector';
import { ArchiveBin } from './components/ArchiveBin';
import { Matrix } from './components/Matrix';
import { ProjectHeader } from './components/ProjectHeader';
import type { CanvasWidget } from '../shared/api/db';
import type { RxDocument } from 'rxdb';

type WidgetType = CanvasWidget['widget_type'];

const WIDGET_COMPONENTS: Record<WidgetType, React.ComponentType<any>> = {
    calendar_master: MasterCalendar,
    smart_list: SmartList,
    detail: DetailInspector,
    archive_bin: ArchiveBin,
    matrix: Matrix,
    project_header: ProjectHeader,
};

interface WidgetFactoryProps {
    widget: RxDocument<CanvasWidget>;
}

export const WidgetFactory: React.FC<WidgetFactoryProps> = ({ widget }) => {
    const Component = WIDGET_COMPONENTS[widget.widget_type];

    if (!Component) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-red-50 text-red-500">
                Unknown Widget: {widget.widget_type}
            </div>
        );
    }

    return <Component widget={widget} />;
};

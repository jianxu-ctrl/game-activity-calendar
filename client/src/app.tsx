import { Route, Routes } from 'react-router-dom';

import Layout from './components/Layout';
import NotFound from './pages/NotFound/NotFound';
import ActivityCalendarPage from './pages/ActivityCalendarPage/ActivityCalendarPage';
import EventCalendarPreviewPage from './pages/EventCalendarPreviewPage/App';
import ToolsHomePage from './pages/ToolsHomePage/ToolsHomePage';

const RoutesComponent = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<ToolsHomePage />} />
        <Route path="calendar" element={<ActivityCalendarPage />} />
        <Route path="preview" element={<EventCalendarPreviewPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default RoutesComponent;

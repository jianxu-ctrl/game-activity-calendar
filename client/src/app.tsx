import { Route, Routes, useSearchParams } from 'react-router-dom';

import Layout from './components/Layout';
import NotFound from './pages/NotFound/NotFound';
import ActivityCalendarPage from './pages/ActivityCalendarPage/ActivityCalendarPage';
import EventCalendarPreviewPage from './pages/EventCalendarPreviewPage/App';
import ToolsHomePage from './pages/ToolsHomePage/ToolsHomePage';

const HomePage = () => {
  const [searchParams] = useSearchParams();

  if (searchParams.get('admin') === '1') {
    return <ActivityCalendarPage />;
  }

  return <ToolsHomePage />;
};

const RoutesComponent = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="calendar" element={<ActivityCalendarPage />} />
        <Route path="preview" element={<EventCalendarPreviewPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default RoutesComponent;

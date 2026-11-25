import { Routes, Route } from "react-router-dom";
import AnalyticsPage from "./components/common/AnalyticsPage";
import Header from "./components/common/Header";
import LoginPage from "./pages/LoginPage";
import MainPage from "./pages/home/MainPage";
import CooperationPage from "./pages/cooperation/CooperationPage";
import CoffeeChatPage from "./pages/coffeeChat/CoffeeChatPage";
import ClubMainPage from "./pages/club/ClubMainPage";
import MyPage from "./pages/myPage/MyPage";
import EmailVerifyPage from "./pages/EmailVerifyPage";
import Footer from "./components/common/Footer";
import CoffeeChatProfilePage from "./pages/coffeeChat/CoffeeChatProfilePage";
import CoffeeChatUserListPage from "./pages/coffeeChat/CoffeeChatUserListPage";
import ClubPostPage from "./pages/club/ClubPostPage";
import ClubPostCreatePage from "./pages/club/ClubPostCreatePage";
import PostDetailPage from "./pages/cooperation/PostDetailPage";
import ClubPostDetail from "./pages/club/ClubPostDetail";
import PresidentPage from "./pages/club/PresidentPage";
import ClubApplicationPage from "./pages/club/ClubApplicationPage";
import ClubCreationPage from "./pages/club/ClubCreationPage";
import ClubDetailPage from "./pages/club/ClubDetailPage";
import VerifiedRoute from "./components/common/VerifiedRoute";
import NotificationsPage from "./pages/notifications/NotificationsPage";
import NotificationEventPage from "./pages/notifications/NotificationEventPage";

function page(path, element) {
  return (
    <Route
      key={path}
      path={path}
      element={<AnalyticsPage route={path}>{element}</AnalyticsPage>}
    />
  );
}

export default function App() {
  return (
    <>
      <Header />
      <Routes>
        {page("/login", <LoginPage />)}
        {page("/email-verify", <EmailVerifyPage />)}
        <Route element={<VerifiedRoute allowGuest />}>
          {page("/", <MainPage />)}
          {page("/cooperation", <CooperationPage />)}
        </Route>
        <Route element={<VerifiedRoute />}>
          {page("/notifications", <NotificationsPage />)}
          {page("/notifications/events/:eventId", <NotificationEventPage />)}
          {page("/coffee-chat", <CoffeeChatPage />)}
          {page("/club/main", <ClubMainPage />)}
          {page("/club/main/:clubId", <ClubMainPage />)}
          {page("/club/apply", <ClubApplicationPage />)}
          {page("/club/apply/:clubId", <ClubDetailPage />)}
          {page("/club/create", <ClubCreationPage />)}
          {page("/my-page", <MyPage />)}
          {page("/coffee-chat/profile/:userId", <CoffeeChatProfilePage />)}
          {page("/coffee-chat/user-list", <CoffeeChatUserListPage />)}
          {page("/club/post", <ClubPostPage />)}
          {page("/club/president/:clubId", <PresidentPage />)}
          {page("/clubs/:clubId/posts/create", <ClubPostCreatePage />)}
          {page("/clubs/:clubId/posts/:postId", <ClubPostDetail />)}
          {page("/cooperation/:type/:id", <PostDetailPage />)}
          {page("/club/posts/:id", <ClubPostDetail />)}
        </Route>
      </Routes>
      <Footer />
    </>
  );
}

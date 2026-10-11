import { Routes, Route } from "react-router-dom";
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
export default function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/email-verify" element={<EmailVerifyPage />} />
        <Route element={<VerifiedRoute allowGuest />}>
          <Route path="/" element={<MainPage />} />
          <Route path="/cooperation" element={<CooperationPage />} />
        </Route>
        <Route element={<VerifiedRoute />}>
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/notifications/events/:eventId" element={<NotificationEventPage />} />
          <Route path="/coffee-chat" element={<CoffeeChatPage />} />
          <Route path="/club/main" element={<ClubMainPage />} />
          <Route path="/club/main/:clubId" element={<ClubMainPage />} />
          <Route path="/club/apply" element={<ClubApplicationPage />} />
          <Route path="/club/apply/:clubId" element={<ClubDetailPage />} />
          <Route path="/club/create" element={<ClubCreationPage />} />
          <Route path="/my-page" element={<MyPage />} />
          <Route path="/coffee-chat/profile/:userId" element={<CoffeeChatProfilePage />} />
          <Route path="/coffee-chat/user-list" element={<CoffeeChatUserListPage />} />
          <Route path="/club/post" element={<ClubPostPage />} />
          <Route path="/club/president/:clubId" element={<PresidentPage />} />
          <Route path="/clubs/:clubId/posts/create" element={<ClubPostCreatePage />} />
          <Route path="/clubs/:clubId/posts/:postId" element={<ClubPostDetail />} />
          <Route path="/cooperation/:type/:id" element={<PostDetailPage />} />
          <Route path="/club/posts/:id" element={<ClubPostDetail />} />
        </Route>
      </Routes>
      <Footer />
    </>
  );
}

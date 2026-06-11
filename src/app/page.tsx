import Header from "./components/Header";
import Chat from "./components/chat/Chat";

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-text antialiased transition-colors">
      <Header />
      <main className="flex flex-1 flex-col">
        <Chat />
      </main>
    </div>
  );
}

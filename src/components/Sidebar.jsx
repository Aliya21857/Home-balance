import * as I from 'lucide-react';
const main = [['Главная',I.Home],['Сегодня',I.CalendarCheck],['Проекты',I.FolderKanban],['Привычки',I.Repeat2],['Идеи',I.Lightbulb],['Размышления',I.MessageCircleHeart],['Календарь',I.CalendarDays],['Заметки',I.NotebookPen],['Библиотека',I.BookOpen],['Цели',I.Target]];
const extra = [['Обзор недели',I.ClipboardList],['Аналитика',I.ChartNoAxesColumnIncreasing],['Архив',I.Archive],['Настройки',I.Settings]];
export default function Sidebar({ page, setPage, open, close, logout }) {
  const item = ([name,Icon]) => <button key={name} className={page === name ? 'nav active' : 'nav'} onClick={() => { setPage(name); close(); }}><Icon />{name}</button>;
  return <aside className={open ? 'sidebar open' : 'sidebar'}><div className="brand"><I.House /> <span>Дом баланса</span><button className="sidebar-close" onClick={close}><I.X /></button></div><nav>{main.map(item)}<div className="divider" />{extra.map(item)}</nav><div className="side-bottom"><div className="ritual"><I.Sprout /><b>Создайте свой ритуал баланса</b><button onClick={() => setPage('Настройки')}>Настроить дом</button></div><button className="logout" onClick={logout}><I.LogOut /> Выйти</button></div></aside>;
}

import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Bell, CalendarClock, ChevronDown, CircleAlert, Clock3, LogOut, Menu, Search, Settings as SettingsIcon, UserRound } from 'lucide-react';
import { auth, isConfigured, ownerUid } from './firebase/firebase';
import { ensureOwnerProfile } from './firebase/firestore';
import { useData } from './hooks/useData';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Settings from './components/Settings';
import { CalendarPage, CollectionPage, Dashboard, Habits, Insights, Reflections } from './components/Pages';

const localDate = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;

function Shell({ user }) {
  const [page,setPage]=useState('Главная'), [drawer,setDrawer]=useState(false), [search,setSearch]=useState(''), [menu,setMenu]=useState(null);
  const {data,loading,error}=useData(user.uid);
  const profile=data.profile || { displayName:'Алия', avatarUrl:'', quote:'Баланс — это не про идеальность, а про честный выбор каждый день.' };
  const collectionPages=['Сегодня','Проекты','Идеи','Заметки','Библиотека','Цели'];
  const all=[...data.tasks.map(x=>['Задача',x.title,'Сегодня']),...data.projects.map(x=>['Проект',x.title,'Проекты']),...data.ideas.map(x=>['Идея',x.title,'Идеи']),...data.notes.map(x=>['Заметка',x.title,'Заметки']),...data.resources.map(x=>['Материал',x.title,'Библиотека'])];
  const results=search?all.filter(x=>x[1]?.toLowerCase().includes(search.toLowerCase())).slice(0,8):[];
  const notifications=useMemo(()=>{const now=new Date(),today=localDate(now),soon=new Date(now);soon.setDate(soon.getDate()+7);const soonDate=localDate(soon);return [...data.tasks.filter(x=>!x.completed&&x.date&&x.date<today).map(x=>({type:'Просрочено',title:x.title,meta:x.date,page:'Сегодня',icon:CircleAlert})),...data.tasks.filter(x=>!x.completed&&x.date===today).map(x=>({type:'Сегодня',title:x.title,meta:x.time||'Без времени',page:'Сегодня',icon:Clock3})),...data.events.filter(x=>x.date===today).map(x=>({type:'Событие',title:x.title,meta:x.startTime||'Весь день',page:'Календарь',icon:CalendarClock})),...data.projects.filter(x=>x.status!=='Завершена'&&x.deadline>=today&&x.deadline<=soonDate).map(x=>({type:'Дедлайн',title:x.title,meta:x.deadline,page:'Проекты',icon:CircleAlert}))]},[data.tasks,data.events,data.projects]);
  const navigate=target=>{setPage(target);setMenu(null);setSearch('')};
  let body;
  if(page==='Главная') body=<Dashboard data={data} setPage={navigate} name={profile.displayName} quote={profile.quote} uid={user.uid}/>;
  else if(collectionPages.includes(page)) body=<CollectionPage page={page} uid={user.uid} items={data[{Сегодня:'tasks',Проекты:'projects',Идеи:'ideas',Заметки:'notes',Библиотека:'resources',Цели:'goals'}[page]]}/>;
  else if(page==='Привычки') body=<Habits uid={user.uid} data={data}/>;
  else if(page==='Размышления') body=<Reflections uid={user.uid} items={data.reflections}/>;
  else if(page==='Календарь') body=<CalendarPage uid={user.uid} data={data}/>;
  else if(['Обзор недели','Аналитика'].includes(page)) body=<Insights page={page} data={data}/>;
  else if(page==='Архив') body=<Insights page="Архив" data={{...data,projects:data.projects.filter(x=>x.status==='Завершена')}}/>;
  else body=<Settings user={user} profile={data.profile}/>;
  return <div className="app"><Sidebar page={page} setPage={navigate} open={drawer} close={()=>setDrawer(false)} logout={()=>signOut(auth)}/><main className="main"><div className="topbar"><button className="menu" onClick={()=>setDrawer(true)} aria-label="Открыть меню"><Menu/></button><div className="global-search"><Search/><input aria-label="Глобальный поиск" placeholder="Найти в доме…" value={search} onChange={e=>setSearch(e.target.value)}/>{search&&<div className="search-results">{results.length?results.map((x,i)=><button key={i} onClick={()=>navigate(x[2])}><small>{x[0]}</small>{x[1]}</button>):<p>Ничего не найдено</p>}</div>}</div><div className="top-action"><button className="icon-btn notification-button" onClick={()=>setMenu(menu==='notifications'?null:'notifications')} aria-label="Уведомления" aria-expanded={menu==='notifications'}><Bell/>{notifications.length>0&&<span>{notifications.length}</span>}</button>{menu==='notifications'&&<div className="dropdown notifications"><h3>Уведомления</h3>{notifications.length?notifications.map((n,i)=><button key={`${n.type}-${i}`} onClick={()=>navigate(n.page)}><n.icon/><span><small>{n.type}</small><b>{n.title}</b><em>{n.meta}</em></span></button>):<div className="quiet"><Bell/><p>Всё спокойно. Новых уведомлений нет.</p></div>}</div>}</div><div className="top-action"><button className="profile-trigger" onClick={()=>setMenu(menu==='profile'?null:'profile')} aria-label="Открыть профиль" aria-expanded={menu==='profile'}>{profile.avatarUrl?<img src={profile.avatarUrl} alt=""/>:<UserRound/>}<ChevronDown/></button>{menu==='profile'&&<div className="dropdown profile-menu"><div className="profile-summary">{profile.avatarUrl?<img src={profile.avatarUrl} alt=""/>:<UserRound/>}<span><b>{profile.displayName}</b><small>{user.email}</small></span></div><button onClick={()=>navigate('Настройки')}><SettingsIcon/> Профиль и настройки</button><button onClick={()=>signOut(auth)}><LogOut/> Выйти</button></div>}</div></div>{menu&&<button className="dropdown-scrim" aria-label="Закрыть меню" onClick={()=>setMenu(null)}/>} {error&&<div className="banner error">Не удалось загрузить данные: {error}</div>}{loading?<div className="loading"><i/><span>Открываем ваш дом…</span></div>:body}</main></div>;
}

export default function App(){const [user,setUser]=useState(isConfigured?undefined:null);useEffect(()=>{if(!isConfigured)return;return onAuthStateChanged(auth,setUser)},[]);useEffect(()=>{if(user?.uid===ownerUid)ensureOwnerProfile(user.uid).catch(()=>{});},[user]);if(user===undefined)return <div className="loading full"><i/></div>;if(!user)return <Login/>;if(user.uid!==ownerUid)return <main className="denied"><div><h1>Этот ключ не подходит</h1><p>У этого аккаунта нет доступа к «Дому баланса».</p><button className="btn" onClick={()=>signOut(auth)}>Вернуться ко входу</button></div></main>;return <Shell user={user}/>;}

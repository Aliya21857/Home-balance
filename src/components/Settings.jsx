import { useState } from 'react';
import { EmailAuthProvider, reauthenticateWithCredential, signOut, updatePassword } from 'firebase/auth';
import { KeyRound, LogOut, Save, UserRound } from 'lucide-react';
import { auth } from '../firebase/firebase';
import { setProfile } from '../firebase/firestore';

const defaultProfile = {
  displayName: 'Алия',
  avatarUrl: '',
  quote: 'Баланс — это не про идеальность, а про честный выбор каждый день.',
};

export default function Settings({ user, profile }) {
  const [form, setForm] = useState({ ...defaultProfile, ...profile });
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileStatus, setProfileStatus] = useState('');
  const [passwordStatus, setPasswordStatus] = useState({ type: '', text: '' });
  const [saving, setSaving] = useState(false);

  const save = async e => {
    e.preventDefault(); setSaving(true); setProfileStatus('');
    try {
      await setProfile(user.uid, { displayName: form.displayName.trim() || 'Алия', avatarUrl: form.avatarUrl.trim(), quote: form.quote.trim() });
      setProfileStatus('Изменения сохранены.');
    } catch { setProfileStatus('Не удалось сохранить изменения.'); }
    finally { setSaving(false); }
  };

  const changePassword = async e => {
    e.preventDefault(); setPasswordStatus({ type:'', text:'' });
    if (newPassword !== confirmPassword) return setPasswordStatus({ type:'error', text:'Новый пароль и подтверждение не совпадают.' });
    if (newPassword.length < 6) return setPasswordStatus({ type:'error', text:'Новый пароль должен содержать не менее 6 символов.' });
    setSaving(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setPasswordStatus({ type:'success', text:'Пароль успешно изменён.' });
    } catch (error) {
      const wrong = ['auth/invalid-credential','auth/wrong-password'].includes(error.code);
      const weak = error.code === 'auth/weak-password';
      setPasswordStatus({ type:'error', text: wrong ? 'Текущий пароль указан неверно.' : weak ? 'Новый пароль не соответствует требованиям Firebase.' : 'Не удалось изменить пароль. Попробуйте войти заново.' });
    } finally { setSaving(false); }
  };

  return <section className="page-section settings-page"><div className="page-head"><div><p className="eyebrow">ВАШ ДОМ</p><h1>Настройки</h1><p>Пусть пространство звучит по-вашему.</p></div></div><div className="settings-grid"><form className="settings-card" onSubmit={save}><div className="settings-title"><UserRound/><div><h2>Профиль</h2><p>Имя и настроение вашего пространства</p></div></div><label><span>Имя</span><input value={form.displayName} onChange={e=>setForm({...form,displayName:e.target.value})} required/></label><label><span>URL аватара <small>необязательно</small></span><input type="url" value={form.avatarUrl} onChange={e=>setForm({...form,avatarUrl:e.target.value})} placeholder="https://…"/></label><label><span>Личная цитата</span><textarea value={form.quote} onChange={e=>setForm({...form,quote:e.target.value})}/></label>{profileStatus&&<p className={profileStatus.startsWith('Не')?'error':'success'}>{profileStatus}</p>}<button className="btn" disabled={saving}><Save/> Сохранить изменения</button></form><div className="settings-stack"><form className="settings-card" onSubmit={changePassword}><div className="settings-title"><KeyRound/><div><h2>Аккаунт</h2><p>{user.email}</p></div></div><label><span>Текущий пароль</span><input type="password" autoComplete="current-password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} required/></label><label><span>Новый пароль</span><input type="password" autoComplete="new-password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} required minLength={6}/></label><label><span>Повторите новый пароль</span><input type="password" autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required minLength={6}/></label>{passwordStatus.text&&<p className={passwordStatus.type}>{passwordStatus.text}</p>}<button className="btn" disabled={saving}>Изменить пароль</button></form><button className="logout-card" onClick={()=>signOut(auth)}><LogOut/><span><b>Выйти из аккаунта</b><small>Вернуться на страницу входа</small></span></button></div></div></section>;
}

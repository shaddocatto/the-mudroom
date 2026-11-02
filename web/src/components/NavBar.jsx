import { NavLink } from 'react-router-dom';
import { DoorIcon, ChatIcon, HookIcon } from '../icons';

export default function NavBar() {
  return (
    <nav className="nav-bar">
      <NavLink to="/kindred" className={({ isActive }) => `nav-item${isActive ? ' is-active' : ''}`}>
        <DoorIcon />
        Kindred Spirits
      </NavLink>
      <NavLink to="/conversations" className={({ isActive }) => `nav-item${isActive ? ' is-active' : ''}`}>
        <ChatIcon />
        Conversations
      </NavLink>
      <NavLink to="/settings" className={({ isActive }) => `nav-item${isActive ? ' is-active' : ''}`}>
        <HookIcon />
        Settings
      </NavLink>
    </nav>
  );
}

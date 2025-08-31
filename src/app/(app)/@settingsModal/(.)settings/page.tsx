import { type Metadata } from 'next';
import SettingsModal from './modal';

export const metadata: Metadata = {
  title: 'Settings | Elora',
};

export default async function SettingsPage() {
  return <SettingsModal />;
}

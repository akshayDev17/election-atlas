import type { Metadata } from 'next';
import NationalView from '@/components/NationalView';
import './national.css';

export const metadata: Metadata = {
  title: 'Election Atlas of India',
  description: 'Every Lok Sabha constituency, each shaded by the party that won it, with state borders drawn over them. Hover a state for its party-wise result. 1980 to 2024.',
};

export default function Page() {
  return <NationalView />;
}

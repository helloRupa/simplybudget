interface AppNameProps {
  as?: 'h1' | 'h2';
}

export default function AppName({ as: Tag = 'h1' }: AppNameProps) {
  return (
    <Tag className="text-2xl font-extrabold tracking-tight">
      <span className="text-white">Simply</span>
      <span className="text-teal-400">Budget</span>
    </Tag>
  );
}

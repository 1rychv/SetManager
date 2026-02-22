export default async function LineupPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="max-w-lg mx-auto p-6">
      <h1>Lineup</h1>
      <p className="text-muted-foreground mt-2">
        Approved performers for: {slug}
      </p>
    </div>
  );
}

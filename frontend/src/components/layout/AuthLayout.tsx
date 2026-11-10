import { Link, Outlet } from 'react-router-dom';

const FEATURES = [
  {
    icon: 'query_stats',
    title: 'Predict before you launch',
    description: 'Score a campaign with the active ML model and see the factors that move the needle.',
  },
  {
    icon: 'verified_user',
    title: 'Fund with confidence',
    description: 'Browse campaigns with transparent goals, reward tiers, and model-backed success signals.',
  },
  {
    icon: 'model_training',
    title: 'Operate the model',
    description: 'Upload datasets, train challengers, compare metrics, and promote a winner in one place.',
  },
];

export function AuthLayout() {
  return (
    <div className="flex min-h-screen bg-canvas">
      <aside className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-house px-10 py-10 text-white lg:flex xl:px-14">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-mint/10"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full border border-mint/15"
          aria-hidden="true"
        />
        <div className="relative">
          <Link to="/campaigns" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-mint text-brand">
              <span className="material-symbols-outlined text-[26px]" aria-hidden="true">
                eco
              </span>
            </span>
            <span>
              <span className="block text-[20px] font-bold tracking-[-0.02em]">CrowdPredict</span>
              <span className="mt-1 block text-[10px] font-medium uppercase tracking-[0.18em] text-mint/80">
                Warm heritage intelligence
              </span>
            </span>
          </Link>
        </div>

        <div className="relative max-w-lg">
          <p className="mb-4 text-label-md font-semibold uppercase tracking-[0.18em] text-gold">
            Evidence-first crowdfunding
          </p>
          <h1 className="text-display-lg font-bold tracking-[-0.02em]">
            Fund the future with evidence, not guesswork.
          </h1>
          <p className="mt-5 max-w-md text-body-lg text-mint/80">
            CrowdPredict pairs a warm marketplace with a serious prediction engine, so creators can test a campaign
            before launch and backers can see the signals behind every story.
          </p>
          <ul className="mt-10 space-y-5">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="flex gap-4">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-gold">
                  <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
                    {feature.icon}
                  </span>
                </span>
                <div>
                  <h2 className="text-body-md font-semibold">{feature.title}</h2>
                  <p className="mt-1 text-body-sm text-mint/70">{feature.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-label-md text-mint/60">CT-263 Object-Oriented Analysis & Design project</p>
      </aside>

      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-line/40 px-5 py-4 lg:hidden">
          <Link to="/campaigns" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-mint text-brand">
              <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
                eco
              </span>
            </span>
            <span className="text-[18px] font-bold tracking-[-0.02em] text-house">CrowdPredict</span>
          </Link>
          <Link to="/campaigns" className="text-label-lg font-medium text-on-surface-variant hover:text-brand">
            Browse
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-md animate-fade-up">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}

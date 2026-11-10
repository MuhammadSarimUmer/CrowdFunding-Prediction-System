import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line/40 bg-surface-low">
      <div className="mx-auto max-w-content px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link to="/campaigns" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-mint text-brand">
                <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
                  eco
                </span>
              </span>
              <span className="text-[18px] font-bold tracking-[-0.02em] text-house">CrowdPredict</span>
            </Link>
            <p className="mt-4 max-w-xs text-body-sm text-muted">
              A warm, evidence-first crowdfunding workspace. Predict campaign outcomes before you launch, then give
              backers a reason to believe.
            </p>
          </div>
          <div>
            <h2 className="text-label-md font-semibold uppercase tracking-[0.12em] text-muted">Product</h2>
            <ul className="mt-4 space-y-2.5 text-body-sm">
              <li>
                <Link to="/campaigns" className="text-on-surface-variant transition hover:text-brand">
                  Discover campaigns
                </Link>
              </li>
              <li>
                <Link to="/my-pledges" className="text-on-surface-variant transition hover:text-brand">
                  My pledges
                </Link>
              </li>
              <li>
                <Link to="/creator/campaigns/new" className="text-on-surface-variant transition hover:text-brand">
                  Launch a campaign
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="text-label-md font-semibold uppercase tracking-[0.12em] text-muted">Intelligence</h2>
            <ul className="mt-4 space-y-2.5 text-body-sm">
              <li>
                <Link to="/creator/predictions" className="text-on-surface-variant transition hover:text-brand">
                  Prediction history
                </Link>
              </li>
              <li>
                <Link to="/admin/models" className="text-on-surface-variant transition hover:text-brand">
                  Model registry
                </Link>
              </li>
              <li>
                <Link to="/admin/datasets" className="text-on-surface-variant transition hover:text-brand">
                  Datasets
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="text-label-md font-semibold uppercase tracking-[0.12em] text-muted">Project</h2>
            <ul className="mt-4 space-y-2.5 text-body-sm">
              <li>
                <span className="text-on-surface-variant">CT-263 OOAD</span>
              </li>
              <li>
                <span className="text-on-surface-variant">CrowdFunding Prediction System</span>
              </li>
              <li>
                <span className="text-on-surface-variant">Warm Heritage Intelligence</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-line/40 pt-6 text-label-md text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} CrowdPredict. Built for the CT-263 OOAD project.</p>
          <p>Campaign outcomes are probabilistic, not guarantees.</p>
        </div>
      </div>
    </footer>
  );
}

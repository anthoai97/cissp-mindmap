import { Link } from 'react-router-dom';
import Page from '../components/Page';

export default function NotFound() {
  return (
    <Page className="not-found">
      <div className="container">
        <h1>Not found</h1>
        <p>This mind map or topic does not exist.</p>
        <Link className="pill" to="/">
          ← All maps
        </Link>
      </div>
    </Page>
  );
}

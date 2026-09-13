import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { useApp } from '../../context/AppContext';
import { useIsMobile } from '../../utils/useIsMobile';

export default function AdminAnalytics() {
  const { getOrgAnalytics, getSkillGapDistribution, exportToCSV } = useApp();
  const isMobile = useIsMobile();

  const stationData = getOrgAnalytics();
  const impactData = getSkillGapDistribution();
  const trendData = [
    { month: 'May', competence: 42, courses: 30 },
    { month: 'Jun', competence: 47, courses: 38 },
    { month: 'Jul', competence: 51, courses: 52 },
    { month: 'Aug', competence: 56, courses: 61 },
    { month: 'Sep', competence: 63, courses: 70 },
  ];

  return (
    <div>
      <div className="skill-gap-alert normal" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <strong>📄 Training Reports:</strong> Export the full IMD trainee learning registry as CSV for offline analysis.
          </div>
          <button className="btn btn-primary btn-sm" onClick={exportToCSV}>⬇ Export Registry to CSV</button>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginBottom: '24px' }}>
        <div className="card">
          <div className="card-header">
            <h3>Course Completion by Station</h3>
          </div>
          <div className="card-body">
            <div className="chart-box" style={{ width: '100%', height: isMobile ? 220 : 350, position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stationData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="completed" name="Courses Completed" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="avg" name="Avg Competency %" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Skill-Gap Distribution Across Stations</h3>
          </div>
          <div className="card-body">
            <div className="chart-box" style={{ width: '100%', height: isMobile ? 220 : 350, position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={impactData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={isMobile ? 80 : 110} label>
                    {impactData.map(entry => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-header">
            <h3>Organisation Improvement Trend</h3>
          </div>
          <div className="card-body">
            <div className="chart-box" style={{ width: '100%', height: isMobile ? 220 : 350, position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} unit="%" />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="competence" name="Competency Score" stroke="#16a34a" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="courses" name="% Courses Complete" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Station Performance Snapshot</h3>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Station</th>
                  <th>Trainees</th>
                  <th>Avg Competency</th>
                  <th>Completion</th>
                </tr>
              </thead>
              <tbody>
                {stationData.map(row => (
                  <tr key={row.name}>
                    <td style={{ fontWeight: 600 }}>{row.name}</td>
                    <td>{row.trainees}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="progress-bar-container" style={{ width: '80px' }}>
                          <div className="progress-bar blue" style={{ width: `${row.avg}%` }} />
                        </div>
                        <span style={{ fontWeight: 700, fontSize: '13px' }}>{row.avg}%</span>
                      </div>
                    </td>
                    <td>{row.completionRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
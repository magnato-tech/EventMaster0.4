import React, { useMemo, useState } from 'react';
import { AppState, CoreRole, GroupCategory } from '../types';
import { ArrowUp, X, ChevronRight } from 'lucide-react';

interface Props {
  db: AppState;
}

interface AttendanceRecord {
  id: string;
  date: string;
  adults: number;
  children: number;
}

// Komponent for å vise besøkskurve
const AttendanceChart: React.FC<{ records: AttendanceRecord[] }> = ({ records }) => {
  const sortedRecords = [...records].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  if (sortedRecords.length === 0) return null;

  const width = 800;
  const height = 300;
  const padding = { top: 20, right: 30, bottom: 50, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Fast y-akse fra 0 til 50
  const minValue = 0;
  const maxValue = 50;
  const range = maxValue - minValue;

  // Beregn x og y posisjoner
  const points = sortedRecords.map((record, index) => {
    const total = record.adults + record.children;
    const x = padding.left + (index / (sortedRecords.length - 1 || 1)) * chartWidth;
    // Y-posisjon basert på fast skala 0-50
    const y = padding.top + chartHeight - ((total - minValue) / range) * chartHeight;
    return { x, y, total, date: record.date };
  });

  // Lag SVG path for kurven
  const pathData = points.map((point, index) => {
    return `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`;
  }).join(' ');

  // Lag område under kurven (for fyll)
  const areaPath = `${pathData} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} className="w-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        {/* Grid-linjer */}
        {[0, 10, 20, 30, 40, 50].map((value) => {
          const ratio = (value - minValue) / range;
          const y = padding.top + chartHeight - (ratio * chartHeight);
          return (
            <g key={value}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 10}
                y={y + 4}
                textAnchor="end"
                fontSize="12"
                fill="#6b7280"
              >
                {value}
              </text>
            </g>
          );
        })}

        {/* Fyll under kurven */}
        <path
          d={areaPath}
          fill="url(#gradient)"
          opacity="0.3"
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Kurve */}
        <path
          d={pathData}
          fill="none"
          stroke="#4f46e5"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Punkter på kurven */}
        {points.map((point, index) => (
          <g key={index}>
            <circle
              cx={point.x}
              cy={point.y}
              r="5"
              fill="#4f46e5"
              stroke="white"
              strokeWidth="2"
            />
            {/* Tooltip ved hover */}
            <title>
              {new Date(point.date).toLocaleDateString('no-NO', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              })}: {point.total} besøkende
            </title>
          </g>
        ))}

        {/* X-akse linje */}
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke="#374151"
          strokeWidth="2"
        />

        {/* X-akse labels */}
        {points.map((point, index) => {
          if (index % Math.ceil(sortedRecords.length / 6) === 0 || index === points.length - 1) {
            return (
              <g key={index}>
                <line
                  x1={point.x}
                  y1={height - padding.bottom}
                  x2={point.x}
                  y2={height - padding.bottom + 5}
                  stroke="#374151"
                  strokeWidth="1"
                />
                <text
                  x={point.x}
                  y={height - padding.bottom + 20}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#6b7280"
                >
                  {new Date(point.date).toLocaleDateString('no-NO', {
                    day: '2-digit',
                    month: 'short'
                  })}
                </text>
              </g>
            );
          }
          return null;
        })}

        {/* Y-akse linje */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={height - padding.bottom}
          stroke="#374151"
          strokeWidth="2"
        />

        {/* Y-akse label */}
        <text
          x={padding.left / 2}
          y={height / 2}
          textAnchor="middle"
          fontSize="12"
          fill="#6b7280"
          transform={`rotate(-90 ${padding.left / 2} ${height / 2})`}
        >
          Antall besøkende
        </text>
      </svg>
    </div>
  );
};

// Hjelpefunksjon for å bestemme kjønn basert på navn
const getGenderFromName = (name: string): 'male' | 'female' => {
  const firstName = name.trim().split(/\s+/)[0].toLowerCase();
  
  // Vanlige norske jentenavn
  const femaleNames = [
    'anne', 'marie', 'kari', 'lise', 'ingrid', 'tone', 'siri', 'elin', 'sara', 'sofie',
    'emma', 'nora', 'ida', 'maja', 'ella', 'sophia', 'alma', 'frida', 'astrid', 'liv',
    'thea', 'helen', 'kristin', 'camilla', 'hanna', 'marte', 'silje', 'mari',
    'vilde', 'mille', 'tiril', 'benny', 'beate', 'vigdis', 'lille-lise'
  ];
  
  // Vanlige norske guttenavn
  const maleNames = [
    'anders', 'lars', 'per', 'tom', 'morten', 'petter', 'andreas', 'thomas', 'magnar',
    'erik', 'ole', 'kristian', 'martin', 'daniel', 'henrik', 'johan', 'simon', 'lukas',
    'marius', 'mats', 'tobias', 'teodor', 'bjørn', 'bjørne', 'bjarne'
  ];
  
  if (femaleNames.some(n => firstName.startsWith(n) || firstName.includes(n))) {
    return 'female';
  }
  if (maleNames.some(n => firstName.startsWith(n) || firstName.includes(n))) {
    return 'male';
  }
  
  // Fallback: hvis navnet slutter på -a, -e, eller -ine, anta kvinne
  if (firstName.endsWith('a') || firstName.endsWith('e') || firstName.endsWith('ine')) {
    return 'female';
  }
  
  // Default: anta mann hvis ikke noe annet matcher
  return 'male';
};

// Komponent for befolkningspyramide (demografisk oversikt)
const PopulationPyramid: React.FC<{ db: AppState }> = ({ db }) => {
  const now = new Date();
  const currentYear = now.getFullYear();

  // Beregn alder for hver person og kategoriser
  const ageGroups = {
    '0-20': { male: 0, female: 0 },
    '20-40': { male: 0, female: 0 },
    '40-60': { male: 0, female: 0 },
    '60+': { male: 0, female: 0 }
  };

  db.persons.forEach(person => {
    let age: number | null = null;
    
    if (person.birth_date) {
      const birthDate = new Date(person.birth_date);
      age = Math.floor((now.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    }

    if (age !== null && age >= 0) {
      const gender = getGenderFromName(person.name);
      const genderKey = gender === 'male' ? 'male' : 'female';

      if (age >= 0 && age < 20) {
        ageGroups['0-20'][genderKey]++;
      } else if (age >= 20 && age < 40) {
        ageGroups['20-40'][genderKey]++;
      } else if (age >= 40 && age < 60) {
        ageGroups['40-60'][genderKey]++;
      } else if (age >= 60) {
        ageGroups['60+'][genderKey]++;
      }
    }
  });

  // Finn maksimal verdi for skalering
  const allValues = Object.values(ageGroups).flatMap(g => [g.male, g.female]);
  const maxValue = Math.max(...allValues, 1); // Minimum 1 for å unngå divisjon med 0

  const width = 800;
  const height = 400;
  const padding = { top: 40, right: 120, bottom: 60, left: 120 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const centerX = padding.left + chartWidth / 2;
  const barHeight = chartHeight / 4; // 4 aldersgrupper
  const spacing = 10; // Spacing mellom grupper

  const ageGroupLabels = ['0-20', '20-40', '40-60', '60+'];

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} className="w-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        {/* Y-akse labels (aldersgrupper) */}
        {ageGroupLabels.map((label, index) => {
          const y = padding.top + index * (barHeight + spacing) + barHeight / 2;
          return (
            <text
              key={label}
              x={centerX}
              y={y}
              textAnchor="middle"
              fontSize="14"
              fontWeight="semibold"
              fill="#374151"
              dominantBaseline="middle"
            >
              {label} år
            </text>
          );
        })}

        {/* Kvinner (venstre side) og Menn (høyre side) */}
        {ageGroupLabels.map((label, index) => {
          const group = ageGroups[label as keyof typeof ageGroups];
          const y = padding.top + index * (barHeight + spacing);
          
          // Beregn søylebredder (prosent av maks)
          const femaleWidth = (group.female / maxValue) * (chartWidth / 2 - 20);
          const maleWidth = (group.male / maxValue) * (chartWidth / 2 - 20);

          return (
            <g key={label}>
              {/* Kvinner - søyle mot venstre */}
              <rect
                x={centerX - femaleWidth - 10}
                y={y + 5}
                width={femaleWidth}
                height={barHeight - 10}
                fill="#ec4899"
                rx="4"
              />
              {/* Kvinner - tall label */}
              {group.female > 0 && (
                <text
                  x={centerX - femaleWidth - 15}
                  y={y + barHeight / 2}
                  textAnchor="end"
                  fontSize="12"
                  fontWeight="bold"
                  fill="#374151"
                  dominantBaseline="middle"
                >
                  {group.female}
                </text>
              )}

              {/* Menn - søyle mot høyre */}
              <rect
                x={centerX + 10}
                y={y + 5}
                width={maleWidth}
                height={barHeight - 10}
                fill="#3b82f6"
                rx="4"
              />
              {/* Menn - tall label */}
              {group.male > 0 && (
                <text
                  x={centerX + maleWidth + 15}
                  y={y + barHeight / 2}
                  textAnchor="start"
                  fontSize="12"
                  fontWeight="bold"
                  fill="#374151"
                  dominantBaseline="middle"
                >
                  {group.male}
                </text>
              )}

              {/* Vertikal linje i midten */}
              <line
                x1={centerX}
                y1={y}
                x2={centerX}
                y2={y + barHeight}
                stroke="#9ca3af"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
            </g>
          );
        })}

        {/* Sentral linje (y-akse) */}
        <line
          x1={centerX}
          y1={padding.top}
          x2={centerX}
          y2={height - padding.bottom}
          stroke="#374151"
          strokeWidth="2"
        />

        {/* Labels for kvinner og menn */}
        <text
          x={padding.left + 20}
          y={padding.top - 10}
          textAnchor="start"
          fontSize="14"
          fontWeight="bold"
          fill="#ec4899"
        >
          Kvinner
        </text>
        <text
          x={width - padding.right - 20}
          y={padding.top - 10}
          textAnchor="end"
          fontSize="14"
          fontWeight="bold"
          fill="#3b82f6"
        >
          Menn
        </text>

        {/* X-akse labels (antall personer) */}
        <text
          x={padding.left / 2}
          y={padding.top + chartHeight / 2}
          textAnchor="middle"
          fontSize="12"
          fill="#6b7280"
          transform={`rotate(-90 ${padding.left / 2} ${padding.top + chartHeight / 2})`}
        >
          Antall personer
        </text>
      </svg>

      {/* Legend */}
      <div className="flex justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-pink-500 rounded"></div>
          <span className="text-sm text-gray-700">Kvinner</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span className="text-sm text-gray-700">Menn</span>
        </div>
      </div>
    </div>
  );
};

const DashboardView: React.FC<Props> = ({ db }) => {
  // Mockup-data for gudstjenestebesøk i 2025
  const initialAttendanceRecords: AttendanceRecord[] = [
    { id: '1', date: '2025-01-05', adults: 28, children: 7 },
    { id: '2', date: '2025-01-12', adults: 24, children: 8 },
    { id: '3', date: '2025-01-19', adults: 30, children: 5 },
    { id: '4', date: '2025-01-26', adults: 32, children: 8 },
    { id: '5', date: '2025-02-02', adults: 26, children: 6 },
    { id: '6', date: '2025-02-09', adults: 22, children: 7 },
    { id: '7', date: '2025-02-16', adults: 35, children: 5 },
    { id: '8', date: '2025-02-23', adults: 28, children: 6 },
    { id: '9', date: '2025-03-02', adults: 25, children: 4 },
    { id: '10', date: '2025-03-09', adults: 31, children: 9 },
  ];

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(initialAttendanceRecords);
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formAdults, setFormAdults] = useState<string>('');
  const [formChildren, setFormChildren] = useState<string>('');
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isFellowshipModalOpen, setIsFellowshipModalOpen] = useState(false);
  const [isChildrenModalOpen, setIsChildrenModalOpen] = useState(false);

  // Beregn statistikk basert på medlemmer (ikke GUEST)
  const stats = useMemo(() => {
    // Medlemmer: alle personer som ikke er gjester
    const members = db.persons.filter(person => person.core_role !== CoreRole.GUEST);
    const totalMembers = members.length;
    
    // Personer i aktiv tjeneste: medlemmer av SERVICE (Team) eller STRATEGY (Ledelse) grupper
    const personsInService = new Set<string>();
    db.groupMembers.forEach(gm => {
      const group = db.groups.find(g => g.id === gm.group_id);
      if (group && (group.category === GroupCategory.SERVICE || group.category === GroupCategory.STRATEGY)) {
        personsInService.add(gm.person_id);
      }
    });
    // Inkluder også personer med service_role_id i assignments
    db.assignments.forEach(a => {
      if (a.person_id && a.service_role_id) {
        personsInService.add(a.person_id);
      }
    });
    const inServiceCount = Array.from(personsInService).filter(id => 
      members.some(m => m.id === id)
    ).length;
    const servicePercentage = totalMembers > 0 ? Math.round((inServiceCount / totalMembers) * 100) : 0;

    // Beregn antall personer per team (SERVICE og STRATEGY grupper slått sammen)
    // Hent alle medlemmer i hver SERVICE og STRATEGY-gruppe
    const teamStats = db.groups
      .filter(group => group.category === GroupCategory.SERVICE || group.category === GroupCategory.STRATEGY)
      .map(group => {
        // Tell alle medlemmer i denne gruppen (alle groupMembers med denne group_id)
        const teamMembers = db.groupMembers.filter(
          gm => gm.group_id === group.id
        );
        return {
          groupId: group.id,
          groupName: group.name,
          memberCount: teamMembers.length
        };
      })
      .sort((a, b) => b.memberCount - a.memberCount); // Sorter etter antall (høyest først)

    // Beregn antall personer per barnegruppe (BARNKIRKE-grupper)
    const childrenGroupStats = db.groups
      .filter(group => group.category === GroupCategory.BARNKIRKE)
      .map(group => {
        const groupMembers = db.groupMembers.filter(
          gm => gm.group_id === group.id
        );
        return {
          groupId: group.id,
          groupName: group.name,
          memberCount: groupMembers.length
        };
      })
      .sort((a, b) => b.memberCount - a.memberCount);
    
    // Barn og unge (0-18 år) blant medlemmer
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Husgrupper: beregn faktiske tall
    const adults = members.filter(person => {
      if (person.birth_date) {
        const birthDate = new Date(person.birth_date);
        const age = Math.floor((now.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        return age >= 18;
      }
      return false;
    });
    const totalAdults = adults.length;
    
    // Beregn antall medlemmer per husgruppe (FELLOWSHIP-grupper)
    const fellowshipStats = db.groups
      .filter(group => group.category === GroupCategory.FELLOWSHIP)
      .map(group => {
        const fellowshipMembers = db.groupMembers.filter(
          gm => gm.group_id === group.id
        );
        return {
          groupId: group.id,
          groupName: group.name,
          memberCount: fellowshipMembers.length
        };
      })
      .sort((a, b) => b.memberCount - a.memberCount);
    
    // Tell unike personer som er medlemmer av minst én husgruppe
    const uniqueFellowshipMembers = new Set<string>();
    db.groupMembers.forEach(gm => {
      const group = db.groups.find(g => g.id === gm.group_id && g.category === GroupCategory.FELLOWSHIP);
      if (group) {
        uniqueFellowshipMembers.add(gm.person_id);
      }
    });
    const inFellowshipCount = uniqueFellowshipMembers.size;
    const fellowshipPercentage = totalAdults > 0 ? Math.round((inFellowshipCount / totalAdults) * 100) : 0;
    const childrenAndYouth = members.filter(person => {
      if (person.birth_date) {
        const birthDate = new Date(person.birth_date);
        const age = Math.floor((now.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        return age < 18;
      }
      return false;
    }).length;
    
    // Beregn snitt gudstjenestebesøk
    const totalAttendance = attendanceRecords.reduce((sum, record) => sum + record.adults + record.children, 0);
    const averageAttendance = attendanceRecords.length > 0 
      ? Math.round(totalAttendance / attendanceRecords.length) 
      : 0;
    
    return {
      inServiceCount,
      servicePercentage,
      inFellowshipCount,
      fellowshipPercentage,
      childrenAndYouth,
      averageAttendance,
      teamStats,
      fellowshipStats,
      totalAdults,
      childrenGroupStats
    };
  }, [db.persons, db.groupMembers, db.assignments, db.groups, attendanceRecords]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const adults = parseInt(formAdults) || 0;
    const children = parseInt(formChildren) || 0;
    
    if (adults > 0 || children > 0) {
      const newRecord: AttendanceRecord = {
        id: crypto.randomUUID(),
        date: formDate,
        adults,
        children
      };
      setAttendanceRecords([...attendanceRecords, newRecord]);
      setFormAdults('');
      setFormChildren('');
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-20 md:pb-8 animate-in fade-in duration-300 text-left">
      <header className="border-b border-slate-200 pb-4">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Menighetsoversikt</h2>
        <p className="text-sm text-slate-500 font-medium">Statistikk og oversikt over menigheten.</p>
      </header>

      {/* Besøkskurve */}
      {attendanceRecords.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Besøksutvikling</h3>
          <AttendanceChart records={attendanceRecords} />
        </div>
      )}

      {/* Demografisk oversikt */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Demografisk oversikt</h3>
        <PopulationPyramid db={db} />
      </div>

      {/* Kakediagrammer for smågrupper i menigheten */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-6">Smågrupper i menigheten</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Husgruppe */}
          {(() => {
            const fellowshipGroups = db.groups.filter(g => g.category === GroupCategory.FELLOWSHIP);
            const fellowshipGroupStats = fellowshipGroups.map(group => ({
              groupId: group.id,
              groupName: group.name,
              memberCount: db.groupMembers.filter(gm => gm.group_id === group.id).length
            })).sort((a, b) => b.memberCount - a.memberCount);
            const totalFellowshipMembers = fellowshipGroupStats.reduce((sum, g) => sum + g.memberCount, 0);
            
            if (fellowshipGroupStats.length > 0 && totalFellowshipMembers > 0) {
              return (
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-700">Husgrupper</h4>
                  <CategoryPieChart
                    groupStats={fellowshipGroupStats}
                    totalMembers={totalFellowshipMembers}
                    categoryName="Husgrupper"
                  />
                </div>
              );
            }
            return null;
          })()}

          {/* Barnekirke */}
          {(() => {
            const barnekirkeGroups = db.groups.filter(g => g.category === GroupCategory.BARNKIRKE);
            const barnekirkeGroupStats = barnekirkeGroups.map(group => ({
              groupId: group.id,
              groupName: group.name,
              memberCount: db.groupMembers.filter(gm => gm.group_id === group.id).length
            })).sort((a, b) => b.memberCount - a.memberCount);
            const totalBarnekirkeMembers = barnekirkeGroupStats.reduce((sum, g) => sum + g.memberCount, 0);
            
            if (barnekirkeGroupStats.length > 0 && totalBarnekirkeMembers > 0) {
              return (
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-700">Barnekirke</h4>
                  <CategoryPieChart
                    groupStats={barnekirkeGroupStats}
                    totalMembers={totalBarnekirkeMembers}
                    categoryName="Barnekirke"
                  />
                </div>
              );
            }
            return null;
          })()}

          {/* Team */}
          {(() => {
            const serviceGroups = db.groups.filter(g => g.category === GroupCategory.SERVICE);
            const serviceGroupStats = serviceGroups.map(group => ({
              groupId: group.id,
              groupName: group.name,
              memberCount: db.groupMembers.filter(gm => gm.group_id === group.id).length
            })).sort((a, b) => b.memberCount - a.memberCount);
            const totalServiceMembers = serviceGroupStats.reduce((sum, g) => sum + g.memberCount, 0);
            
            if (serviceGroupStats.length > 0 && totalServiceMembers > 0) {
              return (
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-700">Team</h4>
                  <CategoryPieChart
                    groupStats={serviceGroupStats}
                    totalMembers={totalServiceMembers}
                    categoryName="Team"
                  />
                </div>
              );
            }
            return null;
          })()}

          {/* Ledelse */}
          {(() => {
            const leadershipGroups = db.groups.filter(g => g.category === GroupCategory.STRATEGY);
            const leadershipGroupStats = leadershipGroups.map(group => ({
              groupId: group.id,
              groupName: group.name,
              memberCount: db.groupMembers.filter(gm => gm.group_id === group.id).length
            })).sort((a, b) => b.memberCount - a.memberCount);
            const totalLeadershipMembers = leadershipGroupStats.reduce((sum, g) => sum + g.memberCount, 0);
            
            if (leadershipGroupStats.length > 0 && totalLeadershipMembers > 0) {
              return (
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-700">Ledelse</h4>
                  <CategoryPieChart
                    groupStats={leadershipGroupStats}
                    totalMembers={totalLeadershipMembers}
                    categoryName="Ledelse"
                  />
                </div>
              );
            }
            return null;
          })()}
        </div>
      </div>

      {/* Statistikk-kort */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Kort 1: I tjeneste */}
        <button
          onClick={() => setIsServiceModalOpen(true)}
          className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:border-indigo-400 hover:shadow-md transition-all text-left cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-1">
            <div className="text-3xl font-bold text-slate-900">
              {stats.inServiceCount}
              <span className="text-lg text-green-600 ml-2">({stats.servicePercentage}%)</span>
            </div>
            <ChevronRight size={20} className="text-gray-400 group-hover:text-indigo-600 transition-colors" />
          </div>
          <div className="text-sm text-gray-500">I tjeneste</div>
        </button>

        {/* Kort 2: I Husgrupper */}
        <button
          onClick={() => setIsFellowshipModalOpen(true)}
          className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:border-indigo-400 hover:shadow-md transition-all text-left cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-1">
            <div className="text-3xl font-bold text-slate-900">
              {stats.inFellowshipCount}
              <span className="text-lg text-green-600 ml-2">({stats.fellowshipPercentage}%)</span>
            </div>
            <ChevronRight size={20} className="text-gray-400 group-hover:text-indigo-600 transition-colors" />
          </div>
          <div className="text-sm text-gray-500">I Husgrupper</div>
        </button>

        {/* Kort 3: Barn & Unge */}
        <button
          onClick={() => setIsChildrenModalOpen(true)}
          className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:border-indigo-400 hover:shadow-md transition-all text-left cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-1">
            <div className="text-3xl font-bold text-slate-900">
              {stats.childrenAndYouth}
            </div>
            <ChevronRight size={20} className="text-gray-400 group-hover:text-indigo-600 transition-colors" />
          </div>
          <div className="text-sm text-gray-500">Barn & Unge</div>
        </button>

        {/* Kort 4: Gudstjenestesnitt */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="text-3xl font-bold text-slate-900">{stats.averageAttendance}</div>
            {stats.averageAttendance > 0 && <ArrowUp size={16} className="text-green-500" />}
          </div>
          <div className="text-sm text-gray-500">Gudstjenestesnitt</div>
        </div>
      </div>

      {/* Registreringsskjema */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Registrer Gudstjeneste</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dato</label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Voksne</label>
              <input
                type="number"
                min="0"
                value={formAdults}
                onChange={(e) => setFormAdults(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Barn</label>
              <input
                type="number"
                min="0"
                value={formChildren}
                onChange={(e) => setFormChildren(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder="0"
              />
            </div>
          </div>
          <button
            type="submit"
            className="px-6 py-2 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 transition-colors"
          >
            Lagre
          </button>
        </form>

        {/* Tabell med registrerte besøk */}
        {attendanceRecords.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-bold text-gray-700 mb-3">Registrerte besøk</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-2 px-4 text-sm font-semibold text-gray-700">Dato</th>
                    <th className="py-2 px-4 text-sm font-semibold text-gray-700">Voksne</th>
                    <th className="py-2 px-4 text-sm font-semibold text-gray-700">Barn</th>
                    <th className="py-2 px-4 text-sm font-semibold text-gray-700">Totalt</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRecords
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((record) => (
                      <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-4 text-sm text-gray-900">
                          {new Date(record.date).toLocaleDateString('no-NO', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="py-2 px-4 text-sm text-gray-700">{record.adults}</td>
                        <td className="py-2 px-4 text-sm text-gray-700">{record.children}</td>
                        <td className="py-2 px-4 text-sm font-semibold text-gray-900">
                          {record.adults + record.children}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal for team-oversikt */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Oversikt over team i tjeneste</h3>
              <button
                onClick={() => setIsServiceModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {stats.teamStats.length > 0 ? (
                <div className="space-y-6">
                  {/* Søylediagram */}
                  <div className="space-y-4">
                    {stats.teamStats.map((team) => {
                      const maxCount = Math.max(...stats.teamStats.map(t => t.memberCount), 1);
                      const percentage = (team.memberCount / maxCount) * 100;
                      
                      return (
                        <div key={team.groupId} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-slate-900 text-sm">{team.groupName}</h4>
                            <span className="text-sm font-bold text-indigo-600">{team.memberCount} personer</span>
                          </div>
                          <div className="relative w-full h-8 bg-gray-100 rounded-lg overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg transition-all duration-500 flex items-center justify-end pr-3"
                              style={{ width: `${percentage}%` }}
                            >
                              {percentage > 15 && (
                                <span className="text-xs font-bold text-white">{team.memberCount}</span>
                              )}
                            </div>
                            {percentage <= 15 && (
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-indigo-600">
                                {team.memberCount}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Oppsummering */}
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">Totalt antall deltakelser</span>
                      <span className="text-xl font-bold text-indigo-600">
                        {stats.teamStats.reduce((sum, team) => sum + team.memberCount, 0)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Merk: En person kan telle flere ganger hvis de er med i flere team
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Ingen team registrert i tjeneste ennå.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal for husgrupper-oversikt med kakediagram */}
      {isFellowshipModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Oversikt over husgrupper</h3>
              <button
                onClick={() => setIsFellowshipModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {stats.fellowshipStats.length > 0 && stats.totalAdults > 0 ? (
                <div className="space-y-6">
                  {/* Kakediagram */}
                  <div className="flex flex-col items-center">
                    <h4 className="text-sm font-semibold text-gray-700 mb-4">
                      Fordeling av voksne medlemmer (18+ år) i husgrupper
                    </h4>
                    <FellowshipPieChart 
                      fellowshipStats={stats.fellowshipStats} 
                      totalAdults={stats.totalAdults}
                    />
                  </div>

                  {/* Legende og detaljer */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700">Husgrupper</h4>
                    {stats.fellowshipStats.map((group) => {
                      const percentage = stats.totalAdults > 0 
                        ? Math.round((group.memberCount / stats.totalAdults) * 100) 
                        : 0;
                      return (
                        <div
                          key={group.groupId}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="flex-1">
                            <h5 className="font-semibold text-slate-900 text-sm">{group.groupName}</h5>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-600">{group.memberCount} medlemmer</span>
                            <span className="text-sm font-bold text-indigo-600">{percentage}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Oppsummering */}
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-slate-900">Totalt antall voksne medlemmer (18+)</span>
                      <span className="text-xl font-bold text-indigo-600">{stats.totalAdults}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">I husgrupper</span>
                      <span className="text-xl font-bold text-indigo-600">{stats.inFellowshipCount}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm text-gray-600">Ikke i husgruppe</span>
                      <span className="text-sm font-semibold text-gray-700">
                        {stats.totalAdults - stats.inFellowshipCount} medlemmer
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Ingen husgrupper registrert ennå.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal for barnegrupper-oversikt */}
      {isChildrenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Oversikt over barnegrupper</h3>
              <button
                onClick={() => setIsChildrenModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {stats.childrenGroupStats && stats.childrenGroupStats.length > 0 ? (
                <div className="space-y-6">
                  {/* Søylediagram */}
                  <div className="space-y-4">
                    {stats.childrenGroupStats.map((group) => {
                      const maxCount = Math.max(...stats.childrenGroupStats.map(g => g.memberCount), 1);
                      const percentage = (group.memberCount / maxCount) * 100;
                      
                      return (
                        <div key={group.groupId} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-slate-900 text-sm">{group.groupName}</h4>
                            <span className="text-sm font-bold text-indigo-600">{group.memberCount} personer</span>
                          </div>
                          <div className="relative w-full h-8 bg-gray-100 rounded-lg overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg transition-all duration-500 flex items-center justify-end pr-3"
                              style={{ width: `${percentage}%` }}
                            >
                              {percentage > 15 && (
                                <span className="text-xs font-bold text-white">{group.memberCount}</span>
                              )}
                            </div>
                            {percentage <= 15 && (
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-indigo-600">
                                {group.memberCount}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Oppsummering */}
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">Totalt antall barn og unge</span>
                      <span className="text-xl font-bold text-indigo-600">
                        {stats.childrenGroupStats.reduce((sum, group) => sum + group.memberCount, 0)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Merk: En person kan telle flere ganger hvis de er med i flere barnegrupper
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Ingen barnegrupper registrert ennå.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Komponent for kakediagram
const FellowshipPieChart: React.FC<{ 
  fellowshipStats: Array<{ groupId: string; groupName: string; memberCount: number }>;
  totalAdults: number;
}> = ({ fellowshipStats, totalAdults }) => {
  const size = 300;
  const radius = 120;
  const centerX = size / 2;
  const centerY = size / 2;

  // Farger for hver gruppe
  const colors = [
    '#4f46e5', '#7c3aed', '#ec4899', '#f59e0b', 
    '#10b981', '#06b6d4', '#6366f1', '#8b5cf6',
    '#f97316', '#84cc16', '#14b8a6', '#3b82f6'
  ];

  let currentAngle = -Math.PI / 2; // Start fra toppen

  const segments = fellowshipStats.map((group, index) => {
    const percentage = totalAdults > 0 ? group.memberCount / totalAdults : 0;
    const angle = percentage * 2 * Math.PI;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    
    // Beregn koordinater for bue
    const x1 = centerX + radius * Math.cos(startAngle);
    const y1 = centerY + radius * Math.sin(startAngle);
    const x2 = centerX + radius * Math.cos(endAngle);
    const y2 = centerY + radius * Math.sin(endAngle);
    
    const largeArcFlag = angle > Math.PI ? 1 : 0;
    
    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');

    const color = colors[index % colors.length];
    currentAngle = endAngle;

    return {
      pathData,
      color,
      percentage,
      groupName: group.groupName,
      memberCount: group.memberCount
    };
  });

  // Beregn posisjon for "Ikke i husgruppe" segment hvis det finnes
  const notInFellowship = totalAdults - fellowshipStats.reduce((sum, g) => sum + g.memberCount, 0);
  let notInFellowshipSegment = null;
  if (notInFellowship > 0) {
    const percentage = notInFellowship / totalAdults;
    const angle = percentage * 2 * Math.PI;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    
    const x1 = centerX + radius * Math.cos(startAngle);
    const y1 = centerY + radius * Math.sin(startAngle);
    const x2 = centerX + radius * Math.cos(endAngle);
    const y2 = centerY + radius * Math.sin(endAngle);
    
    const largeArcFlag = angle > Math.PI ? 1 : 0;
    
    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');

    notInFellowshipSegment = {
      pathData,
      color: '#e5e7eb',
      percentage,
      groupName: 'Ikke i husgruppe',
      memberCount: notInFellowship
    };
  }

  return (
    <div className="relative">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Husgrupper */}
        {segments.map((segment, index) => (
          <g key={index}>
            <path
              d={segment.pathData}
              fill={segment.color}
              stroke="white"
              strokeWidth="2"
              opacity="0.9"
            />
            <title>
              {segment.groupName}: {segment.memberCount} medlemmer ({Math.round(segment.percentage * 100)}%)
            </title>
          </g>
        ))}
        
        {/* Ikke i husgruppe */}
        {notInFellowshipSegment && (
          <g>
            <path
              d={notInFellowshipSegment.pathData}
              fill={notInFellowshipSegment.color}
              stroke="white"
              strokeWidth="2"
              opacity="0.7"
            />
            <title>
              {notInFellowshipSegment.groupName}: {notInFellowshipSegment.memberCount} medlemmer ({Math.round(notInFellowshipSegment.percentage * 100)}%)
            </title>
          </g>
        )}
        
        {/* Sentral tekst */}
        <text
          x={centerX}
          y={centerY - 10}
          textAnchor="middle"
          fontSize="18"
          fontWeight="bold"
          fill="#1f2937"
        >
          {totalAdults}
        </text>
        <text
          x={centerX}
          y={centerY + 15}
          textAnchor="middle"
          fontSize="12"
          fill="#6b7280"
        >
          voksne
        </text>
      </svg>
    </div>
  );
};

// Generisk komponent for kakediagram for en kategori
const CategoryPieChart: React.FC<{
  groupStats: Array<{ groupId: string; groupName: string; memberCount: number }>;
  totalMembers: number;
  categoryName: string;
}> = ({ groupStats, totalMembers, categoryName }) => {
  const size = 240;
  const radius = 85;
  const centerX = size / 2;
  const centerY = size / 2;
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Formelle, profesjonelle farger med god kontrast - forskjellige sett for hver kategori
  const colorSets: Record<string, string[]> = {
    'Husgrupper': ['#1e40af', '#065f46', '#78350f', '#581c87', '#9a3412', '#155e75'], // Blå, grønn, brun, lilla, oransje, cyan (mørkere toner)
    'Barnekirke': ['#991b1b', '#6b21a8', '#9f1239', '#92400e', '#166534', '#164e63'], // Rød, lilla, rosa, brun, grønn, blå (mørkere toner)
    'Team': ['#1e3a8a', '#5b21b6', '#9a3412', '#365314', '#164e63', '#1e40af'], // Blå, lilla, oransje, grønn, cyan, blå (mørkere toner)
    'Ledelse': ['#991b1b', '#6b21a8', '#166534', '#92400e', '#155e75', '#9f1239'] // Rød, lilla, grønn, brun, cyan, rosa (mørkere toner)
  };
  
  const colors = colorSets[categoryName] || [
    '#1e40af', '#991b1b', '#065f46', '#78350f', 
    '#581c87', '#9a3412', '#155e75', '#6b21a8'
  ];

  let currentAngle = -Math.PI / 2; // Start fra toppen

  const segments = groupStats.map((group, index) => {
    const percentage = totalMembers > 0 ? group.memberCount / totalMembers : 0;
    const angle = percentage * 2 * Math.PI;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    
    const x1 = centerX + radius * Math.cos(startAngle);
    const y1 = centerY + radius * Math.sin(startAngle);
    const x2 = centerX + radius * Math.cos(endAngle);
    const y2 = centerY + radius * Math.sin(endAngle);
    
    const largeArcFlag = angle > Math.PI ? 1 : 0;
    
    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');

    const color = colors[index % colors.length];
    currentAngle = endAngle;

    // Beregn posisjon for tekst (midtpunkt av segmentet)
    const midAngle = startAngle + angle / 2;
    const labelRadius = radius * 1.25; // Plasser tekst litt utenfor kaka
    const labelX = centerX + labelRadius * Math.cos(midAngle);
    const labelY = centerY + labelRadius * Math.sin(midAngle);

    return {
      pathData,
      color,
      percentage,
      groupName: group.groupName,
      memberCount: group.memberCount,
      index,
      labelX,
      labelY
    };
  });

  return (
    <div className="flex flex-col space-y-4">
      {/* Kakediagram */}
      <div className="flex justify-center">
        <div className="relative">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-sm">
            {/* Grupper */}
            {segments.map((segment) => {
              const percentageText = Math.round(segment.percentage * 100);
              const showLabel = segment.percentage > 0.03; // Vis kun hvis segmentet er større enn 3%
              return (
                <g 
                  key={segment.index}
                  onMouseEnter={() => setHoveredIndex(segment.index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <path
                    d={segment.pathData}
                    fill={segment.color}
                    stroke="white"
                    strokeWidth="3"
                    opacity={hoveredIndex === segment.index || hoveredIndex === null ? 1 : 0.5}
                    style={{ transition: 'opacity 0.2s' }}
                  />
                  {/* Prosentandel utenfor kakestykket */}
                  {showLabel && (
                    <text
                      x={segment.labelX}
                      y={segment.labelY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="11"
                      fontWeight="bold"
                      fill="#1f2937"
                      style={{ pointerEvents: 'none' }}
                    >
                      {percentageText}%
                    </text>
                  )}
                  <title>
                    {segment.groupName}: {segment.memberCount} medlemmer ({percentageText}%)
                  </title>
                </g>
              );
            })}
            
            {/* Sentral tekst - totalt antall personer */}
            <text
              x={centerX}
              y={centerY - 6}
              textAnchor="middle"
              fontSize="18"
              fontWeight="bold"
              fill="#1f2937"
            >
              {totalMembers}
            </text>
            <text
              x={centerX}
              y={centerY + 10}
              textAnchor="middle"
              fontSize="11"
              fill="#6b7280"
            >
              personer
            </text>
          </svg>
        </div>
      </div>

      {/* Totalt antall */}
      <div className="text-center">
        <div className="text-sm font-semibold text-gray-700">
          Totalt: {totalMembers} personer
        </div>
      </div>

      {/* Forklaring (Legend) - viser farger og grupper */}
      <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
        {segments.map((segment) => {
          const percentage = Math.round(segment.percentage * 100);
          const isHovered = hoveredIndex === segment.index;
          return (
            <div
              key={segment.index}
              className="flex items-center gap-2.5 p-1.5 rounded-md transition-all text-xs"
              style={{ 
                backgroundColor: isHovered ? `${segment.color}15` : 'transparent'
              }}
              onMouseEnter={() => setHoveredIndex(segment.index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div 
                className="w-3.5 h-3.5 rounded flex-shrink-0 border border-gray-300"
                style={{ backgroundColor: segment.color }}
              />
              <div className="flex-1 min-w-0 text-gray-900 font-medium truncate">
                {segment.groupName}
              </div>
              <div className="text-gray-600 font-semibold whitespace-nowrap">
                {segment.memberCount} ({percentage}%)
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardView;


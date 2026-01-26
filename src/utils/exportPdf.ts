import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SeasonStats, PlayerProfile, GameStats } from '@/types/basketball';
import { format } from 'date-fns';

export function exportSeasonStatsPdf(
  profile: PlayerProfile,
  seasonStats: SeasonStats,
  games: GameStats[]
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Title
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Season Stats Report', pageWidth / 2, 20, { align: 'center' });

  // Player Info
  doc.setFontSize(16);
  doc.text(profile.name, pageWidth / 2, 32, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `#${profile.number} | ${profile.position} | ${profile.team}`,
    pageWidth / 2,
    40,
    { align: 'center' }
  );
  doc.text(`${profile.grade} | ${profile.height}`, pageWidth / 2, 47, {
    align: 'center',
  });

  // Generated date
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(
    `Generated: ${format(new Date(), 'MMMM d, yyyy')}`,
    pageWidth / 2,
    55,
    { align: 'center' }
  );
  doc.setTextColor(0);

  // Season Record
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Season Record', 14, 70);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Games Played: ${seasonStats.gamesPlayed}`, 14, 80);
  doc.text(`Record: ${seasonStats.wins} - ${seasonStats.losses}`, 14, 87);
  doc.text(
    `Win %: ${
      seasonStats.gamesPlayed > 0
        ? Math.round((seasonStats.wins / seasonStats.gamesPlayed) * 100)
        : 0
    }%`,
    14,
    94
  );

  // Season Averages Table
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Season Averages', 14, 110);

  autoTable(doc, {
    startY: 115,
    head: [['Stat', 'Average']],
    body: [
      ['Points', seasonStats.avgPoints.toString()],
      ['Rebounds', seasonStats.avgRebounds.toString()],
      ['Assists', seasonStats.avgAssists.toString()],
      ['Steals', seasonStats.avgSteals.toString()],
      ['Blocks', seasonStats.avgBlocks.toString()],
    ],
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
    margin: { left: 14, right: pageWidth / 2 + 10 },
    tableWidth: pageWidth / 2 - 24,
  });

  // Shooting Percentages Table
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Shooting Percentages', pageWidth / 2 + 10, 110);

  autoTable(doc, {
    startY: 115,
    head: [['Type', 'Percentage']],
    body: [
      ['Field Goal %', `${seasonStats.fgPercentage}%`],
      ['3-Point %', `${seasonStats.threePtPercentage}%`],
      ['Free Throw %', `${seasonStats.ftPercentage}%`],
    ],
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
    margin: { left: pageWidth / 2 + 10, right: 14 },
    tableWidth: pageWidth / 2 - 24,
  });

  // Game Log
  if (games.length > 0) {
    const tableEndY = (doc as any).lastAutoTable?.finalY || 160;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Game Log', 14, tableEndY + 15);

    autoTable(doc, {
      startY: tableEndY + 20,
      head: [['Date', 'Opponent', 'Result', 'PTS', 'REB', 'AST', 'STL', 'BLK']],
      body: games.map((game) => [
        format(new Date(game.date), 'MM/dd/yy'),
        game.opponent,
        game.isWin ? 'W' : 'L',
        game.points.toString(),
        game.rebounds.toString(),
        game.assists.toString(),
        game.steals.toString(),
        game.blocks.toString(),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 40 },
        2: { cellWidth: 18 },
      },
    });
  }

  // Save the PDF
  const fileName = `${profile.name.replace(/\s+/g, '_')}_Season_Stats_${format(
    new Date(),
    'yyyy-MM-dd'
  )}.pdf`;
  doc.save(fileName);
}

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SeasonStats, PlayerProfile, GameStats, HalfStats } from '@/types/basketball';
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

interface GameBoxScoreData {
  game: GameStats;
  firstHalf?: HalfStats;
  secondHalf?: HalfStats;
}

export function exportGameBoxScorePdf(
  profile: PlayerProfile,
  gameData: GameBoxScoreData
) {
  const doc = new jsPDF({ orientation: 'landscape' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const { game, firstHalf, secondHalf } = gameData;

  // Title Header
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Official Basketball Box Score - Game Totals - Final Statistics', pageWidth / 2, 12, { align: 'center' });
  
  doc.setFontSize(14);
  doc.text(`${profile.team} vs ${game.opponent}`, pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(format(new Date(game.date), 'M/d/yy'), pageWidth / 2, 27, { align: 'center' });

  // Team name and score
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`${profile.team} ${game.points}`, 14, 40);

  // Calculate percentages
  const fgPct = game.fgAttempted > 0 ? ((game.fgMade / game.fgAttempted) * 100).toFixed(1) : '0.0';
  const threePct = game.threePtAttempted > 0 ? ((game.threePtMade / game.threePtAttempted) * 100).toFixed(1) : '0.0';
  const ftPct = game.ftAttempted > 0 ? ((game.ftMade / game.ftAttempted) * 100).toFixed(1) : '0.0';

  // Main stats table
  autoTable(doc, {
    startY: 45,
    head: [[
      '##', 'Player', 
      'Total\nFG-FGA', '3-Ptr\nFG-FGA', 'FT-FTA',
      'Off', 'Def', 'Tot',
      'PF', 'TP', 'A', 'TO', 'Blk', 'Stl', 'Min'
    ]],
    body: [
      [
        profile.number.toString().padStart(2, '0'),
        profile.name,
        `${game.fgMade}-${game.fgAttempted}`,
        `${game.threePtMade}-${game.threePtAttempted}`,
        `${game.ftMade}-${game.ftAttempted}`,
        (game.offensiveRebounds || 0).toString(),
        (game.defensiveRebounds || 0).toString(),
        game.rebounds.toString(),
        '0', // Personal fouls - not tracked
        game.points.toString(),
        game.assists.toString(),
        game.turnovers.toString(),
        game.blocks.toString(),
        game.steals.toString(),
        game.minutesPlayed.toString()
      ],
    ],
    foot: [[
      '', 'Totals',
      `${game.fgMade}-${game.fgAttempted}`,
      `${game.threePtMade}-${game.threePtAttempted}`,
      `${game.ftMade}-${game.ftAttempted}`,
      (game.offensiveRebounds || 0).toString(),
      (game.defensiveRebounds || 0).toString(),
      game.rebounds.toString(),
      '0',
      game.points.toString(),
      game.assists.toString(),
      game.turnovers.toString(),
      game.blocks.toString(),
      game.steals.toString(),
      game.minutesPlayed.toString()
    ]],
    theme: 'plain',
    styles: { 
      fontSize: 9,
      cellPadding: 2,
      lineWidth: 0.1,
      lineColor: [0, 0, 0],
    },
    headStyles: { 
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      lineWidth: 0.1,
    },
    footStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      lineWidth: 0.1,
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 45 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 12, halign: 'center' },
      6: { cellWidth: 12, halign: 'center' },
      7: { cellWidth: 12, halign: 'center' },
      8: { cellWidth: 12, halign: 'center' },
      9: { cellWidth: 14, halign: 'center' },
      10: { cellWidth: 12, halign: 'center' },
      11: { cellWidth: 12, halign: 'center' },
      12: { cellWidth: 12, halign: 'center' },
      13: { cellWidth: 12, halign: 'center' },
      14: { cellWidth: 14, halign: 'center' },
    },
    didDrawCell: (data) => {
      // Draw vertical line after Rebounds section
      if (data.column.index === 7 && data.section === 'body') {
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.3);
        doc.line(
          data.cell.x + data.cell.width,
          data.cell.y,
          data.cell.x + data.cell.width,
          data.cell.y + data.cell.height
        );
      }
    }
  });

  const tableEndY = (doc as any).lastAutoTable?.finalY || 80;

  // Half-by-half shooting breakdown
  if (firstHalf && secondHalf) {
    // Calculate 2PT stats (FG minus 3PT)
    const first1H2PtMade = firstHalf.fgMade - firstHalf.threePtMade;
    const first1H2PtAttempted = firstHalf.fgAttempted - firstHalf.threePtAttempted;
    const second2H2PtMade = secondHalf.fgMade - secondHalf.threePtMade;
    const second2H2PtAttempted = secondHalf.fgAttempted - secondHalf.threePtAttempted;
    const game2PtMade = game.fgMade - game.threePtMade;
    const game2PtAttempted = game.fgAttempted - game.threePtAttempted;

    const first1H2PtPct = first1H2PtAttempted > 0 
      ? ((first1H2PtMade / first1H2PtAttempted) * 100).toFixed(1) 
      : '0.0';
    const second2H2PtPct = second2H2PtAttempted > 0 
      ? ((second2H2PtMade / second2H2PtAttempted) * 100).toFixed(1) 
      : '0.0';
    const game2PtPct = game2PtAttempted > 0 
      ? ((game2PtMade / game2PtAttempted) * 100).toFixed(1) 
      : '0.0';
    
    const first1H3Pct = firstHalf.threePtAttempted > 0 
      ? ((firstHalf.threePtMade / firstHalf.threePtAttempted) * 100).toFixed(1) 
      : '0.0';
    const second2H3Pct = secondHalf.threePtAttempted > 0 
      ? ((secondHalf.threePtMade / secondHalf.threePtAttempted) * 100).toFixed(1) 
      : '0.0';
    
    const first1HFtPct = firstHalf.ftAttempted > 0 
      ? ((firstHalf.ftMade / firstHalf.ftAttempted) * 100).toFixed(1) 
      : '0.0';
    const second2HFtPct = secondHalf.ftAttempted > 0 
      ? ((secondHalf.ftMade / secondHalf.ftAttempted) * 100).toFixed(1) 
      : '0.0';

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    const shootingY = tableEndY + 8;
    
    // 2PT FG% breakdown
    doc.text(
      `2PT % 1st Half: ${first1H2PtMade}-${first1H2PtAttempted}  ${first1H2PtPct}%    ` +
      `2nd half: ${second2H2PtMade}-${second2H2PtAttempted}  ${second2H2PtPct}%    ` +
      `Game: ${game2PtMade}-${game2PtAttempted}  ${game2PtPct}%`,
      14, shootingY
    );

    // 3FG% breakdown
    doc.text(
      `3PT % 1st Half: ${firstHalf.threePtMade}-${firstHalf.threePtAttempted}  ${first1H3Pct}%    ` +
      `2nd half: ${secondHalf.threePtMade}-${secondHalf.threePtAttempted}  ${second2H3Pct}%    ` +
      `Game: ${game.threePtMade}-${game.threePtAttempted}  ${threePct}%`,
      14, shootingY + 5
    );

    // FT% breakdown
    doc.text(
      `FT % 1st Half: ${firstHalf.ftMade}-${firstHalf.ftAttempted}  ${first1HFtPct}%    ` +
      `2nd half: ${secondHalf.ftMade}-${secondHalf.ftAttempted}  ${second2HFtPct}%    ` +
      `Game: ${game.ftMade}-${game.ftAttempted}  ${ftPct}%`,
      14, shootingY + 10
    );

    // Blocks breakdown
    doc.text(
      `Blocks: 1st Half: ${firstHalf.blocks}    2nd half: ${secondHalf.blocks}    Game: ${game.blocks}`,
      14, shootingY + 18
    );

    // Steals breakdown
    doc.text(
      `Steals: 1st Half: ${firstHalf.steals}    2nd half: ${secondHalf.steals}    Game: ${game.steals}`,
      14, shootingY + 23
    );

    // Score by periods table
    const periodsY = shootingY + 32;
    doc.setFont('helvetica', 'bold');
    doc.text('Score by periods', 14, periodsY);

    autoTable(doc, {
      startY: periodsY + 3,
      head: [['', '1st', '2nd', 'Total']],
      body: [
        [profile.team, firstHalf.points.toString(), secondHalf.points.toString(), game.points.toString()],
      ],
      theme: 'plain',
      styles: { 
        fontSize: 9,
        cellPadding: 2,
        lineWidth: 0.1,
        lineColor: [0, 0, 0],
      },
      headStyles: { 
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
      },
      tableWidth: 105,
    });
  } else {
    // If no half data, just show game totals
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    const shootingY = tableEndY + 8;
    doc.text(`FG %: ${game.fgMade}-${game.fgAttempted}  ${fgPct}%`, 14, shootingY);
    doc.text(`3FG %: ${game.threePtMade}-${game.threePtAttempted}  ${threePct}%`, 14, shootingY + 5);
    doc.text(`FT %: ${game.ftMade}-${game.ftAttempted}  ${ftPct}%`, 14, shootingY + 10);
  }

  // Save the PDF
  const fileName = `${profile.team.replace(/\s+/g, '_')}_vs_${game.opponent.replace(/\s+/g, '_')}_${format(
    new Date(game.date),
    'yyyy-MM-dd'
  )}_BoxScore.pdf`;
  doc.save(fileName);
}

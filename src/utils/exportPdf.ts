import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SeasonStats, PlayerProfile, GameStats, HalfStats } from '@/types/basketball';
import { MilestoneDefinition, MilestoneRarity } from '@/types/milestone';
import { format } from 'date-fns';

// Detect mobile for share sheet
function isMobileDevice(): boolean {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
    (window.innerWidth <= 768 && 'ontouchstart' in window);
}

// Save or share PDF depending on platform
async function saveOrSharePdf(doc: jsPDF, fileName: string): Promise<void> {
  const blob = doc.output('blob');
  const file = new File([blob], fileName, { type: 'application/pdf' });

  if (isMobileDevice() && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: fileName });
      return;
    } catch (e: any) {
      // User cancelled share — still fall through to save
      if (e?.name === 'AbortError') return;
    }
  }
  doc.save(fileName);
}

// Logo as base64 - will be loaded dynamically
let logoBase64Cache: string | null = null;

// Load the logo image and convert to base64
async function getLogoBase64(): Promise<string | null> {
  if (logoBase64Cache) return logoBase64Cache;
  
  try {
    // Import the logo from assets
    const logoModule = await import('@/assets/hoop-journal-logo.png');
    const logoUrl = logoModule.default;
    
    const response = await fetch(logoUrl);
    const blob = await response.blob();
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        logoBase64Cache = reader.result as string;
        resolve(logoBase64Cache);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error('Failed to load logo for PDF:', e);
    return null;
  }
}

// Add watermark logo to a PDF page
function addWatermarkToPage(doc: jsPDF, logoData: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Large centered watermark - size based on page orientation
  const isLandscape = pageWidth > pageHeight;
  const watermarkSize = isLandscape ? 100 : 80;
  const x = (pageWidth - watermarkSize) / 2;
  const y = (pageHeight - watermarkSize) / 2;
  
  // Save current graphics state
  doc.saveGraphicsState();
  
  // Set low opacity for watermark effect
  doc.setGState(doc.GState({ opacity: 0.08 }));
  
  try {
    doc.addImage(logoData, 'PNG', x, y, watermarkSize, watermarkSize);
  } catch (e) {
    console.error('Failed to add watermark:', e);
  }
  
  // Restore graphics state
  doc.restoreGraphicsState();
}

// Add small header logo in top-left corner
function addHeaderLogo(doc: jsPDF, logoData: string) {
  const logoSize = 15; // Small logo size
  const margin = 8;
  
  try {
    doc.addImage(logoData, 'PNG', margin, margin, logoSize, logoSize);
  } catch (e) {
    console.error('Failed to add header logo:', e);
  }
}

// Helper function to load image as base64 (shared utility)
async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function exportSeasonStatsPdf(
  profile: PlayerProfile,
  seasonStats: SeasonStats,
  games: GameStats[]
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Load and add watermark + header logo
  const logoData = await getLogoBase64();
  if (logoData) {
    addWatermarkToPage(doc, logoData);
    addHeaderLogo(doc, logoData);
  }

  // Load player avatar if available
  let avatarData: string | null = null;
  if (profile.avatar) {
    avatarData = await loadImageAsBase64(profile.avatar);
  }

  // Title
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Season Stats Report', pageWidth / 2, 20, { align: 'center' });

  // Player Avatar and Info
  const avatarSize = 25;
  const avatarX = 14;
  const avatarY = 28;
  
  if (avatarData) {
    try {
      // Draw circular avatar with clipping
      doc.saveGraphicsState();
      doc.addImage(avatarData, 'JPEG', avatarX, avatarY, avatarSize, avatarSize);
      doc.restoreGraphicsState();
    } catch (e) {
      console.error('Failed to add avatar to PDF:', e);
    }
  }

  // Player name and info - adjust position if avatar exists
  const textStartX = avatarData ? avatarX + avatarSize + 8 : pageWidth / 2;
  const textAlign = avatarData ? 'left' : 'center';
  
  doc.setFontSize(16);
  doc.text(profile.name, textStartX, avatarData ? avatarY + 8 : 32, { align: textAlign as any });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `#${profile.number} | ${profile.position} | ${profile.team}`,
    textStartX,
    avatarData ? avatarY + 16 : 40,
    { align: textAlign as any }
  );
  doc.text(`${profile.grade} | ${profile.height}`, textStartX, avatarData ? avatarY + 23 : 47, {
    align: textAlign as any,
  });

  // Generated date
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(
    `Generated: ${format(new Date(), 'MMMM d, yyyy')}`,
    pageWidth / 2,
    avatarData ? avatarY + avatarSize + 8 : 55,
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
      head: [['Date', 'Opponent', 'Result', 'PTS', 'REB', 'AST', 'STL', 'BLK', 'PF']],
      body: games.map((game) => [
        format(new Date(game.date), 'MM/dd/yy'),
        game.opponent,
        game.isWin ? 'W' : 'L',
        game.points.toString(),
        game.rebounds.toString(),
        game.assists.toString(),
        game.steals.toString(),
        game.blocks.toString(),
        (game.fouls ?? 0).toString(),
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

interface EarnedMilestoneForPdf {
  milestone: MilestoneDefinition;
  earnedAt: string;
}

interface GameBoxScoreData {
  game: GameStats;
  firstHalf?: HalfStats;
  secondHalf?: HalfStats;
  coachRecap?: string | null;
  gamePhotoUrl?: string;
  milestones?: EarnedMilestoneForPdf[];
}

export async function exportGameBoxScorePdf(
  profile: PlayerProfile,
  gameData: GameBoxScoreData
) {
  const doc = new jsPDF({ orientation: 'landscape' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const { game, firstHalf, secondHalf, coachRecap, gamePhotoUrl, milestones } = gameData;

  // Load and add watermark + header logo to first page
  const logoData = await getLogoBase64();
  if (logoData) {
    addWatermarkToPage(doc, logoData);
    addHeaderLogo(doc, logoData);
  }

  // Load player avatar if available
  let avatarData: string | null = null;
  if (profile.avatar) {
    avatarData = await loadImageAsBase64(profile.avatar);
  }

  // Title Header with Avatar
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Official Basketball Box Score - Game Totals - Final Statistics', pageWidth / 2, 12, { align: 'center' });
  
  // Build match title with final score if available
  let matchTitle = `${profile.team} vs ${game.opponent}`;
  if (game.finalScoreUs !== undefined && game.finalScoreThem !== undefined) {
    matchTitle = `${profile.team} ${game.finalScoreUs} - ${game.finalScoreThem} ${game.opponent}`;
  }
  
  doc.setFontSize(14);
  doc.text(matchTitle, pageWidth / 2, 20, { align: 'center' });
  
  // Date and halftime score
  let dateInfo = format(new Date(game.date), 'M/d/yy');
  if (game.halftimeScoreUs !== undefined && game.halftimeScoreThem !== undefined) {
    dateInfo += `  •  Halftime: ${game.halftimeScoreUs} - ${game.halftimeScoreThem}`;
  }
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(dateInfo, pageWidth / 2, 27, { align: 'center' });

  // Add player avatar in top-right corner
  if (avatarData) {
    const avatarSize = 18;
    const avatarX = pageWidth - avatarSize - 8;
    const avatarY = 8;
    try {
      doc.addImage(avatarData, 'JPEG', avatarX, avatarY, avatarSize, avatarSize);
    } catch (e) {
      console.error('Failed to add avatar to PDF:', e);
    }
  }

  // Team name, player number, and points scored
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`${profile.team}  •  #${profile.number} ${profile.name}  •  PTS: ${game.points}`, 14, 40);

  // Calculate TOTAL field goals (2PT + 3PT combined) for display
  const totalFgMade = game.fgMade + game.threePtMade;
  const totalFgAttempted = game.fgAttempted + game.threePtAttempted;
  const totalFgPct = totalFgAttempted > 0 ? ((totalFgMade / totalFgAttempted) * 100).toFixed(1) : '0.0';
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
        `${totalFgMade}-${totalFgAttempted}`,
        `${game.threePtMade}-${game.threePtAttempted}`,
        `${game.ftMade}-${game.ftAttempted}`,
        (game.offensiveRebounds || 0).toString(),
        (game.defensiveRebounds || 0).toString(),
        game.rebounds.toString(),
        (game.fouls ?? 0).toString(),
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
      `${totalFgMade}-${totalFgAttempted}`,
      `${game.threePtMade}-${game.threePtAttempted}`,
      `${game.ftMade}-${game.ftAttempted}`,
      (game.offensiveRebounds || 0).toString(),
      (game.defensiveRebounds || 0).toString(),
      game.rebounds.toString(),
      (game.fouls ?? 0).toString(),
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

    // Fouls breakdown
    doc.text(
      `Fouls (PF): 1st Half: ${firstHalf.fouls ?? 0}    2nd half: ${secondHalf.fouls ?? 0}    Game: ${game.fouls ?? 0}`,
      14, shootingY + 28
    );

    // Score by periods table
    const periodsY = shootingY + 38;
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
    doc.text(`FG %: ${totalFgMade}-${totalFgAttempted}  ${totalFgPct}%`, 14, shootingY);
    doc.text(`3FG %: ${game.threePtMade}-${game.threePtAttempted}  ${threePct}%`, 14, shootingY + 5);
    doc.text(`FT %: ${game.ftMade}-${game.ftAttempted}  ${ftPct}%`, 14, shootingY + 10);
  }

  // Add Game Photo if available
  if (gamePhotoUrl || game.gamePhotoUrl) {
    const photoUrl = gamePhotoUrl || game.gamePhotoUrl;
    if (photoUrl) {
      doc.addPage();
      
      // Add watermark and header logo to this page
      if (logoData) {
        addWatermarkToPage(doc, logoData);
        addHeaderLogo(doc, logoData);
      }
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Game Day Photo', pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`${profile.team} vs ${game.opponent} - ${format(new Date(game.date), 'MMMM d, yyyy')}`, pageWidth / 2, 28, { align: 'center' });

      try {
        const imageData = await loadImageAsBase64(photoUrl);
        if (imageData) {
          // Add image centered on page, max width 200, maintain aspect ratio
          const imgWidth = 180;
          const imgHeight = 120;
          const x = (pageWidth - imgWidth) / 2;
          doc.addImage(imageData, 'JPEG', x, 40, imgWidth, imgHeight);
        }
      } catch (e) {
        console.error('Failed to add game photo to PDF:', e);
      }
    }
  }

  // Add Milestones Earned if available
  if (milestones && milestones.length > 0) {
    // Rarity colors for badges
    const rarityColors: Record<MilestoneRarity, [number, number, number]> = {
      common: [100, 116, 139],
      uncommon: [34, 197, 94],
      rare: [245, 158, 11],
      epic: [168, 85, 247],
      legendary: [249, 115, 22],
    };

    const cardWidth = 85;
    const cardHeight = 35;
    const cardsPerRow = 3;
    const rowsPerPage = 4;
    const cardsPerPage = cardsPerRow * rowsPerPage;
    const startX = (pageWidth - (cardWidth * cardsPerRow + 10 * (cardsPerRow - 1))) / 2;
    const startY = 40;

    // Sort milestones by rarity (legendary first, common last)
    const rarityOrder: Record<string, number> = {
      legendary: 0,
      epic: 1,
      rare: 2,
      uncommon: 3,
      common: 4,
    };
    const sortedMilestones = [...milestones].sort((a, b) => 
      (rarityOrder[a.milestone.rarity] || 4) - (rarityOrder[b.milestone.rarity] || 4)
    );

    const totalPages = Math.ceil(sortedMilestones.length / cardsPerPage);

    for (let page = 0; page < totalPages; page++) {
      doc.addPage();
      
      // Add watermark and header logo to this page
      if (logoData) {
        addWatermarkToPage(doc, logoData);
        addHeaderLogo(doc, logoData);
      }
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      const pageLabel = totalPages > 1 ? ` (${page + 1}/${totalPages})` : '';
      doc.text(`Milestones Earned${pageLabel}`, pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`${profile.team} vs ${game.opponent} - ${format(new Date(game.date), 'MMMM d, yyyy')}`, pageWidth / 2, 28, { align: 'center' });

      // Get milestones for this page
      const pageStartIndex = page * cardsPerPage;
      const pageMilestones = sortedMilestones.slice(pageStartIndex, pageStartIndex + cardsPerPage);

      pageMilestones.forEach((earned, index) => {
        const row = Math.floor(index / cardsPerRow);
        const col = index % cardsPerRow;
        const x = startX + col * (cardWidth + 10);
        const y = startY + row * (cardHeight + 8);

        const color = rarityColors[earned.milestone.rarity] || rarityColors.common;
        
        // Card background
        doc.setFillColor(240, 240, 240);
        doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3, 'F');
        
        // Left accent bar with rarity color
        doc.setFillColor(color[0], color[1], color[2]);
        doc.rect(x, y, 4, cardHeight, 'F');
        
        // Milestone name
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        const nameLines = doc.splitTextToSize(earned.milestone.name, cardWidth - 12);
        doc.text(nameLines[0], x + 8, y + 12);
        
        // Rarity label
        doc.setFontSize(7);
        doc.setTextColor(color[0], color[1], color[2]);
        doc.text(earned.milestone.rarity.toUpperCase(), x + 8, y + 18);
        
        // Description
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        const descLines = doc.splitTextToSize(earned.milestone.description, cardWidth - 12);
        doc.text(descLines.slice(0, 2).join('\n'), x + 8, y + 25);
        
        doc.setTextColor(0, 0, 0);
      });
    }
  }

  // Add Coach AI Recap if included
  if (coachRecap) {
    doc.addPage();
    
    // Add watermark and header logo to this page
    if (logoData) {
      addWatermarkToPage(doc, logoData);
      addHeaderLogo(doc, logoData);
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Post-Game Recap from Coach AI', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${profile.team} vs ${game.opponent} - ${format(new Date(game.date), 'MMMM d, yyyy')}`, pageWidth / 2, 28, { align: 'center' });

    // Clean up markdown formatting and remove emojis/icons for PDF
    const cleanRecap = coachRecap
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markers
      .replace(/\*(.*?)\*/g, '$1') // Remove italic markers
      .replace(/#{1,6}\s*/g, '') // Remove heading markers
      .replace(/- /g, '• ') // Replace dashes with bullets
      // Remove emojis and special unicode characters that don't render in PDF
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Emojis
      .replace(/[\u{2600}-\u{26FF}]/gu, '') // Misc symbols
      .replace(/[\u{2700}-\u{27BF}]/gu, '') // Dingbats
      .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
      .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport symbols
      .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // Flags
      .replace(/[\u{2300}-\u{23FF}]/gu, '') // Technical symbols
      .replace(/[\u{2B50}]/gu, '') // Star
      .replace(/[\u{1F4A5}-\u{1F4FF}]/gu, '') // Various symbols
      .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Supplemental symbols
      .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '') // Chess symbols and extended-A
      .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '') // Symbols extended-A
      .replace(/[\u{231A}-\u{231B}]/gu, '') // Watch, hourglass
      .replace(/[\u{23E9}-\u{23F3}]/gu, '') // Media control symbols
      .replace(/[\u{23F8}-\u{23FA}]/gu, '') // Media control symbols
      .replace(/[\u{25AA}-\u{25AB}]/gu, '') // Small squares
      .replace(/[\u{25B6}]/gu, '') // Play button
      .replace(/[\u{25C0}]/gu, '') // Reverse button
      .replace(/[\u{25FB}-\u{25FE}]/gu, '') // Squares
      .replace(/[\u{2614}-\u{2615}]/gu, '') // Umbrella, hot beverage
      .replace(/[\u{2648}-\u{2653}]/gu, '') // Zodiac
      .replace(/[\u{267F}]/gu, '') // Wheelchair
      .replace(/[\u{2693}]/gu, '') // Anchor
      .replace(/[\u{26A1}]/gu, '') // High voltage
      .replace(/[\u{26AA}-\u{26AB}]/gu, '') // Circles
      .replace(/[\u{26BD}-\u{26BE}]/gu, '') // Sports balls
      .replace(/[\u{26C4}-\u{26C5}]/gu, '') // Weather
      .replace(/[\u{26CE}]/gu, '') // Ophiuchus
      .replace(/[\u{26D4}]/gu, '') // No entry
      .replace(/[\u{26EA}]/gu, '') // Church
      .replace(/[\u{26F2}-\u{26F3}]/gu, '') // Fountain, golf
      .replace(/[\u{26F5}]/gu, '') // Sailboat
      .replace(/[\u{26FA}]/gu, '') // Tent
      .replace(/[\u{26FD}]/gu, '') // Fuel pump
      .replace(/\s{2,}/g, ' ') // Clean up multiple spaces
      .trim();
    
    doc.setFontSize(11);
    const splitText = doc.splitTextToSize(cleanRecap, pageWidth - 28);
    doc.text(splitText, 14, 40);
  }

  // Save the PDF
  const fileName = `${profile.team.replace(/\s+/g, '_')}_vs_${game.opponent.replace(/\s+/g, '_')}_${format(
    new Date(game.date),
    'yyyy-MM-dd'
  )}_BoxScore.pdf`;
  doc.save(fileName);
}

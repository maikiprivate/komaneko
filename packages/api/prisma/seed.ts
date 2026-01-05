/**
 * シードデータ投入スクリプト
 */
import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/shared/utils/password.js'

const prisma = new PrismaClient()

// 環境変数から管理者情報を取得
const ADMIN_EMAIL = process.env.ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

/**
 * パスワードがルールに従っているかチェック
 * - 8文字以上
 * - 小文字を含む
 * - 大文字を含む
 * - 数字を含む
 */
function validatePassword(password: string): boolean {
  if (password.length < 8) return false
  if (!/[a-z]/.test(password)) return false
  if (!/[A-Z]/.test(password)) return false
  if (!/[0-9]/.test(password)) return false
  return true
}

// データソース: /Users/maikishinbo/Documents/ソースコード/mate3_5_7_9_11
// 先手番（b）のみを選択
const tsumeshogiProblems = [
  // 3手詰め（10問）
  { sfen: 'lns+R4l/1p1p5/p1pkppB1p/6p2/1R7/6P1P/P1PPnPS2/2+b1G1g2/L3K1sNL b 2GS3Pnp', moveCount: 3, status: 'published' },
  { sfen: 'lnsG5/4g4/prpp1p1pp/1p4p2/4+B3k/2P1P4/P+b1PSP1LP/4K2SL/2G2G1r1 b SP3nl3p', moveCount: 3, status: 'published' },
  { sfen: 'l5+R1l/4kS3/p4pnpp/2Pppb3/6p1P/P2s5/NP2+nPPR1/2+bS2GK1/L6NL b 3GSP4p', moveCount: 3, status: 'published' },
  { sfen: 'lR5nl/5k1b1/2gp3p1/2s1p1P2/p4N2p/P3PpR2/1PPP1P2P/2G1K2s1/LN6L b GSN2Pbgs2p', moveCount: 3, status: 'published' },
  { sfen: 'l1+R5l/2pS5/p2pp+P1pp/2k3p2/2N4P1/PP2R1P1P/2+pPP1N2/2GSG1bs1/LN1K4L b 2GSNPbp', moveCount: 3, status: 'published' },
  { sfen: 'lnsg4l/1r1b5/p1pp1+N1+R1/4p3p/9/P3SSk2/NpPPPPg1P/2GK5/L1S4NL b 2Pbg4p', moveCount: 3, status: 'published' },
  { sfen: 'l3k2G1/1+B4gPl/n2+Nppsp1/pP2R2bp/9/Pps1P1N1P/2GG1P3/3S5/LNK5L b R6Ps', moveCount: 3, status: 'published' },
  { sfen: 'lnkgp1+R1l/1rs4+P1/p1ppG2p1/4N3p/3S5/P7P/2+lPP4/2G1KP3/L1S4+b1 b BN2Pgsn4p', moveCount: 3, status: 'published' },
  { sfen: '3g2S1l/3s2k2/3ppplpp/2p3R2/rP7/1LP1P2P1/N2P1P2P/2GSG4/3KN2NL b BG4Pbsnp', moveCount: 3, status: 'published' },
  { sfen: 'l1G1k2nl/2Rs2+R2/pp2bp2p/4p1p2/1n1p1N2P/4P1P2/PPG1SP3/2p1G4/LN1K1s2L b 3Pbgsp', moveCount: 3, status: 'published' },

  // 5手詰め（10問）
  { sfen: 'ln5+Pl/3s1kg+R1/p2ppl2p/2ps1Bp2/P8/2P3P1P/N2gP4/5KS2/L+r3G1N+b b GS3Pn3p', moveCount: 5, status: 'published' },
  { sfen: 'l3k3l/1r1sg1B2/3p2+R1p/2p1pN2P/9/pPP1PP3/3PK1P2/2G1sg3/LNS2+n1NL b 5Pbgsp', moveCount: 5, status: 'published' },
  { sfen: 'ln1+P1GBnl/s8/p1p1p1kpp/3P2p2/5p3/Pp3PPP1/1P1SP3P/2R6/1N1GKG1NL b BGLr2sp', moveCount: 5, status: 'published' },
  { sfen: 'ln1s3nl/1+S4+B2/p1p1k2pp/3p2P2/7P1/P1Pnpp1R1/1P1P+lP2P/2G1G4/L1SKP2N+b b R2GPsp', moveCount: 5, status: 'published' },
  { sfen: 'ln1k1g3/5s3/p1p1pp1pp/3p5/5+Bp2/2P2PPP1/P3S+n2P/2G3+l2/+p3K3L b RBG2SNL2Prgnp', moveCount: 5, status: 'published' },
  { sfen: 'ln1G3nl/1ks1n+PR2/p1pp4p/5ppp1/8b/1P2p4/PGPPP+s2P/1B7/LNSK1G2L b RGSP2p', moveCount: 5, status: 'published' },
  { sfen: 'l5g1+R/3g1s3/p2p1p1k1/1r2p1Npp/3P+bPL2/1b4P1P/P+n2PS3/4GGL2/LN3K1P1 b SN3Ps2p', moveCount: 5, status: 'published' },
  { sfen: '1n4R1l/2k3GR1/p1sp1pg2/1p2+B1p1p/2P6/P1pL5/1PNsPPP1P/4g1S2/Lb3GKNL b SN4P', moveCount: 5, status: 'published' },
  { sfen: 'lnr2k1nl/6gp1/pl2S3p/2p1p1p2/1P1N1P1N1/P2S1pP1P/3P5/1+p1SG2B1/L1PK5 b BGPrgs2p', moveCount: 5, status: 'published' },
  { sfen: 'ln1+R3+Pl/5n3/4pp3/p1k5p/bp7/7p1/PP+pPPP+B1P/5K3/LN1G1G2L b R2G2S3P2snp', moveCount: 5, status: 'published' },

  // 7手詰め（10問）
  { sfen: 'ln1g2B+Rl/2s6/pPppppk2/6p1p/9/4P1P1P/P1PPSP3/3+psK3/L+r3G1NL b SNb2gn2p', moveCount: 7, status: 'published' },
  { sfen: 'l6nl/3k2+B2/p1n1g2pp/2G1ppp2/2P2N1P1/3P2P1P/Ps1GP4/1+rSK2R2/LN6L b G3Pb2s2p', moveCount: 7, status: 'published' },
  { sfen: '3g4l/+R1sg2S2/p1npk1s+Rp/2pb2p2/4g2N1/1p7/P1PP1PP1P/1P1S5/LNK2G1+lL b N3Pb2p', moveCount: 7, status: 'published' },
  { sfen: 'l1gks1gnl/3s5/p1S1pp3/2+Bp4p/1p2P4/P1PP1P1P1/1P6P/1BKG5/LN4+rNL b GSN4Pr', moveCount: 7, status: 'published' },
  { sfen: 'ln2+Rg1nl/5g1k1/p2+B1p1gp/4p2R1/2pK2p2/P3P1P1P/3+b1PN2/5S3/L7L b 2SN7Pgs', moveCount: 7, status: 'published' },
  { sfen: 'lnsg1+R2l/k3+P4/pP1p4p/1G2p1p2/1N+B6/P1P1lg3/2+bP1PP1P/1p3S3/K4G1NL b 3Pr2snp', moveCount: 7, status: 'published' },
  { sfen: '1ng2p1S1/4kg2+R/pBp1psnpp/3P2p2/9/2n1PPPP1/PP2l3P/1+p3LG2/6KNL b RGSPbslp', moveCount: 7, status: 'published' },
  { sfen: '2s1kg2l/1p3g1P1/+R1Npps+B1p/3l1lp2/p8/2P1P1P2/PPNP1SN1P/1+bS1G2R1/1+p1K4L b GN3P', moveCount: 7, status: 'published' },
  { sfen: 'ln1B1k3/5r3/p2pp+Pgs1/2ps3pl/P4+bp2/1PP2n3/1G1PP2R1/2SK5/LN7 b GLgsn6p', moveCount: 7, status: 'published' },
  { sfen: 'l2+R4l/6ks1/3sg2pp/p1pbp1p2/3pbp1P1/2P2PN2/P3G1P1P/4GKSR1/LN5NL b GSPn3p', moveCount: 7, status: 'published' },
]

async function main() {
  console.log('Seeding database...')

  // ========== 管理者アカウント ==========
  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    if (!validatePassword(ADMIN_PASSWORD)) {
      console.error('ADMIN_PASSWORD does not meet requirements:')
      console.error('  - At least 8 characters')
      console.error('  - At least one lowercase letter')
      console.error('  - At least one uppercase letter')
      console.error('  - At least one number')
      process.exit(1)
    }

    const existingAdmin = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
    })

    if (existingAdmin) {
      // 既存のアカウントを管理者に更新
      await prisma.user.update({
        where: { email: ADMIN_EMAIL },
        data: { role: 'admin' },
      })
      console.log(`Updated existing user to admin: ${ADMIN_EMAIL}`)
    } else {
      // 新規作成
      const passwordHash = await hashPassword(ADMIN_PASSWORD)
      await prisma.user.create({
        data: {
          email: ADMIN_EMAIL,
          username: 'admin',
          passwordHash,
          isAnonymous: false,
          role: 'admin',
        },
      })
      console.log(`Created admin user: ${ADMIN_EMAIL}`)
    }
  } else {
    console.log('Skipping admin creation (ADMIN_EMAIL or ADMIN_PASSWORD not set)')
  }

  // ========== 詰将棋データ ==========
  // SFEN照合でupsert（既存IDを保持し、学習記録との整合性を維持）
  let created = 0
  let skipped = 0

  // 手数ごとの現在の最大問題番号を取得
  const maxNumbers = await prisma.tsumeshogi.groupBy({
    by: ['moveCount'],
    _max: { problemNumber: true },
  })
  const maxNumberByMoveCount = new Map(
    maxNumbers.map((m) => [m.moveCount, m._max.problemNumber ?? 0])
  )

  for (const problem of tsumeshogiProblems) {
    const existing = await prisma.tsumeshogi.findUnique({
      where: { sfen: problem.sfen },
    })

    if (existing) {
      skipped++
    } else {
      // 次の問題番号を採番
      const currentMax = maxNumberByMoveCount.get(problem.moveCount) ?? 0
      const nextNumber = currentMax + 1
      maxNumberByMoveCount.set(problem.moveCount, nextNumber)

      await prisma.tsumeshogi.create({
        data: {
          ...problem,
          problemNumber: nextNumber,
        },
      })
      created++
    }
  }

  console.log(`Tsumeshogi: ${created} created, ${skipped} skipped (already exist)`)

  // 投入結果を確認
  const counts = await prisma.tsumeshogi.groupBy({
    by: ['moveCount'],
    _count: true,
  })
  console.log('Problems by moveCount:')
  for (const c of counts) {
    console.log(`  ${c.moveCount}手詰め: ${c._count}問`)
  }

  console.log('Seeding completed!')
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

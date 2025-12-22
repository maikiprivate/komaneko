/**
 * ダッシュボードページ
 */
import { Link } from 'react-router-dom'

export function Dashboard() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">ダッシュボード</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">詰将棋</h2>
          <p className="text-3xl font-bold text-blue-600">-</p>
          <p className="text-sm text-gray-500 mt-1">問題数</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">レッスン</h2>
          <p className="text-3xl font-bold text-green-600">-</p>
          <p className="text-sm text-gray-500 mt-1">コース数</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">ユーザー</h2>
          <p className="text-3xl font-bold text-purple-600">-</p>
          <p className="text-sm text-gray-500 mt-1">登録数</p>
        </div>
      </div>

      <div className="mt-8 bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">クイックアクション</h2>
        <div className="flex gap-4">
          <Link
            to="/tsumeshogi/new"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            詰将棋を追加
          </Link>
          <Link
            to="/lesson"
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          >
            レッスンを管理
          </Link>
        </div>
      </div>
    </div>
  )
}

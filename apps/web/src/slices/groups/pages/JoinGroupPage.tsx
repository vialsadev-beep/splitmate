import { useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useJoinGroup } from '../api/groups.queries'
import { PageLoader } from '@/shared/components/LoadingSpinner'

export default function JoinGroupPage() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const joinGroup = useJoinGroup()
  const attempted = useRef(false)

  useEffect(() => {
    if (!code || attempted.current) return
    attempted.current = true

    joinGroup.mutate(
      { inviteCode: code },
      {
        onSuccess: (group) => navigate(`/groups/${group.id}`, { replace: true }),
        onError: () => navigate('/groups', { replace: true }),
      },
    )
  }, [code])

  return <PageLoader />
}

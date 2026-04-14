import { getServiceBadgeClass } from '../../utils/format.js';

/**
 * 공용 뱃지. service prop 주면 서비스 타입별 색상, 아니면 cls 를 직접 지정
 */
export default function Badge({ children, cls, service }) {
  const finalCls = service ? getServiceBadgeClass(service) : (cls || 'badge-default');
  return <span className={`badge ${finalCls}`}>{children}</span>;
}

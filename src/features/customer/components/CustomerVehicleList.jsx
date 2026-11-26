import Button from '@/shared/ui/Button.jsx'
import EmptyState from '@/shared/ui/EmptyState.jsx'
import { NO_VEHICLES_MESSAGE, vehicleCountText } from '../detailFlow'
import VehicleRow from './VehicleRow.jsx'
import './customerDetail.css'

// S-06 차량 영역: 머리(건수·"도래·임박은 오늘 기준") + 차량 카드 목록, 차량이 없으면 "등록된 차량이 없습니다." (09 S-06·5장, 08 07).
// 차량 순서는 서버가 준 순서 그대로(08 07, 백엔드 차량 id 오름차순).
// 차량 추가(6-1 #21): onAddVehicle이 있으면 머리와 빈 상태에 [차량 추가] 버튼을 그린다(연결 안 된 버튼 없음, 09 0장).
// addForm은 pages가 넘기는 인라인 입력(AddVehicleInline). 열려 있으면 pages가 onAddVehicle을 빼서 버튼이 사라진다.
// vehicleLink(차량) → { to, state }: 카드를 눌러 갈 곳(S-07). pages가 정한다. 없으면 카드를 누를 수 없다.

export default function CustomerVehicleList({ vehicles, vehicleLink, onAddVehicle, addForm }) {
  return (
    <section className="customer-vehicles" aria-labelledby="customer-vehicles-title">
      <header className="customer-vehicles__header">
        <div>
          <h2 id="customer-vehicles-title" className="customer-vehicles__title">
            차량
          </h2>
          <p className="customer-vehicles__meta">{vehicleCountText(vehicles.length)}</p>
        </div>
        {onAddVehicle && (
          <Button variant="secondary" size="sm" onClick={onAddVehicle}>
            차량 추가
          </Button>
        )}
      </header>
      {addForm}
      {vehicles.length === 0 ? (
        <EmptyState
          title={NO_VEHICLES_MESSAGE}
          compact
          action={onAddVehicle ? { label: '차량 추가', onClick: onAddVehicle } : undefined}
        />
      ) : (
        <ul className="customer-vehicles__grid">
          {vehicles.map((vehicle) => (
            <li key={vehicle.vehicleId}>
              <VehicleRow vehicle={vehicle} link={vehicleLink?.(vehicle)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

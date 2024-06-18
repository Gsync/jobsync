import ActivitiesTable from "./ActivitiesTable";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

function ActivitiesContainer() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activities</CardTitle>
      </CardHeader>
      <CardContent>
        <ActivitiesTable />
      </CardContent>
    </Card>
  );
}

export default ActivitiesContainer;

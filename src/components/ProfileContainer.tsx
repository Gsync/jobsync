import ActivitiesTable from "./ActivitiesTable";
import CreateResume from "./CreateResume";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

function ActivitiesContainer() {
  return (
    <Card>
      <CardHeader className="flex-row justify-between items-center">
        <CardTitle>Profile</CardTitle>
        <div className="flex items-center">
          <CreateResume />
        </div>
      </CardHeader>
      <CardContent></CardContent>
    </Card>
  );
}

export default ActivitiesContainer;
